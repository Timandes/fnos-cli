const settings = require('../utils/settings');

function runCompletion(args, dependencies = {}) {
  const settingsStore = dependencies.settingsStore || settings;
  const stdout = dependencies.stdout || process.stdout;
  const stderr = dependencies.stderr || process.stderr;
  if (args.length !== 1 || args[0] !== 'server') {
    stderr.write('Error: unsupported completion request.\n');
    return 2;
  }
  try {
    const names = settingsStore.listServerNamesReadOnly();
    if (names.length > 0) stdout.write(`${names.join('\n')}\n`);
  } catch {
    return 0;
  }
  return 0;
}

module.exports = { runCompletion };
