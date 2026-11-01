const { StringDecoder } = require('node:string_decoder');
const { t, getLanguage, withLanguage } = require('../i18n');
const { CommandParameterError } = require('../commands/options');

function inputError(message) { return new CommandParameterError(t(message)); }
function validatePassword(password) {
  if (!password || /[\r\n]/.test(password)) {
    throw inputError('Password must be non-empty and contain only one line.');
  }
  return password;
}

async function stdinPassword(input) {
  if (input.isTTY) throw inputError('--password-stdin requires piped or redirected input.');
  const chunks = [];
  let length = 0;
  try {
    for await (const chunk of input) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      length += bytes.length;
      if (length > 65536) throw new Error('Input too large');
      chunks.push(bytes);
    }
  } catch {
    throw inputError('Failed to read password from stdin.');
  }
  // Preserve password whitespace; remove only a single conventional line ending.
  return validatePassword(Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, ''));
}

function promptPassword(input, output) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw inputError('Password input requires an interactive terminal. Use --password-stdin or --password.');
  }
  return new Promise((resolve, reject) => {
    const wasRaw = Boolean(input.isRaw);
    const wasFlowing = input.readableFlowing;
    const language = getLanguage();
    const promptError = message => withLanguage(language, () => inputError(message));
    const decoder = new StringDecoder('utf8');
    let password = '';
    let escape = '';
    let finished = false;
    const cancelError = () => {
      const error = promptError('Password entry cancelled.');
      error.exitCode = 130;
      return error;
    };
    function finish(error) {
      if (finished) return;
      finished = true;
      input.removeListener('data', onData);
      input.removeListener('end', onEnd);
      input.removeListener('close', onEnd);
      input.removeListener('error', onError);
      process.removeListener('SIGINT', onInterrupt);
      try {
        input.setRawMode(wasRaw);
        if (!wasFlowing) input.pause();
        output.write('\n');
      } catch { error = error || promptError('Failed to restore terminal after password entry.'); }
      if (error) reject(error);
      else {
        try { resolve(withLanguage(language, () => validatePassword(password))); }
        catch (validationError) { reject(validationError); }
      }
      password = '';
    }
    function onInterrupt() { finish(cancelError()); }
    function onEnd() { finish(promptError('Password input ended before confirmation.')); }
    function onError() { finish(promptError('Failed to read password from terminal.')); }
    function onData(chunk) {
      const text = typeof chunk === 'string' ? chunk : decoder.write(chunk);
      for (const char of text) {
        if (char === '\x03') { onInterrupt(); return; }
        if (char === '\x04') { onEnd(); return; }
        if (char === '\r' || char === '\n') { finish(); return; }
        if (escape) {
          // Ignore terminal escape sequences (arrows, function keys, etc.).
          escape += char;
          if (escape.length > 2 && /[@-~]/.test(char)) escape = '';
          else if (escape.length === 2 && !['[', 'O'].includes(char)) escape = '';
          continue;
        }
        if (char === '\x1b') { escape = char; continue; }
        if (char === '\x7f' || char === '\b') { password = Array.from(password).slice(0, -1).join(''); continue; }
        if (char >= ' ' && char !== '\x7f') password += char;
      }
    }
    input.on('data', onData);
    input.once('end', onEnd);
    input.once('close', onEnd);
    input.once('error', onError);
    process.once('SIGINT', onInterrupt);
    try {
      input.setRawMode(true);
      output.write(t('Password: '));
      input.resume();
      if (input.readableEnded || input.destroyed) onEnd();
    } catch { onError(); }
  });
}

async function resolvePassword(options, { input = process.stdin, output = process.stderr } = {}) {
  if (options.password !== undefined && options.passwordStdin) {
    throw inputError('--password and --password-stdin cannot be used together.');
  }
  if (options.password !== undefined) return validatePassword(options.password);
  return options.passwordStdin ? stdinPassword(input) : promptPassword(input, output);
}

module.exports = { resolvePassword };
