const readline = require('node:readline/promises');
const { sortServerNames } = require('./settings');

class ServerSelectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServerSelectionError';
    this.exitCode = 3;
  }
}

async function terminalPrompt(message, { input, output }) {
  const terminal = readline.createInterface({ input, output, terminal: true });
  try {
    return await terminal.question(message);
  } finally {
    terminal.close();
  }
}

function sortServers(servers) {
  const byName = new Map(servers.map((server) => [server.name, server]));
  return sortServerNames([...byName.keys()]).map((name) => byName.get(name));
}

function escapeTerminalValue(value) {
  return String(value).replace(
    /[\u0000-\u001f\u007f-\u009f]/g,
    (character) => {
      if (character === '\n') return '\\n';
      if (character === '\r') return '\\r';
      if (character === '\t') return '\\t';
      return `\\u${character.codePointAt(0).toString(16).padStart(4, '0')}`;
    }
  );
}

async function selectServer(servers, dependencies = {}) {
  const ordered = sortServers(servers);
  if (ordered.length === 0) {
    throw new ServerSelectionError(
      'No saved servers found. Run "fnos login" first.'
    );
  }
  if (ordered.length === 1) return ordered[0].name;
  const input = dependencies.input || process.stdin;
  const output = dependencies.output || process.stderr;
  if (!input.isTTY || !output.isTTY) {
    const names = ordered.map(({ name }) => name).join(', ');
    throw new ServerSelectionError(
      `Multiple saved servers are available: ${names}. Use --server <name>.`
    );
  }
  const prompt = dependencies.prompt || terminalPrompt;
  output.write('Select a server:\n');
  ordered.forEach((server, index) => {
    output.write(
      `  ${index + 1}) ${server.name}  ` +
      `${escapeTerminalValue(server.endpoint)}  ` +
      `(${escapeTerminalValue(server.username)})\n`
    );
  });

  while (true) {
    let answer;
    try {
      answer = await prompt(`Server [1-${ordered.length}]: `, {
        input,
        output
      });
    } catch {
      throw new ServerSelectionError('Server selection was cancelled.');
    }
    if (answer === null || answer === undefined) {
      throw new ServerSelectionError('Server selection was cancelled.');
    }
    const trimmed = String(answer).trim();
    if (/^\d+$/.test(trimmed)) {
      const index = Number(trimmed) - 1;
      if (ordered[index]) return ordered[index].name;
    }
    output.write(`Enter a number from 1 to ${ordered.length}.\n`);
  }
}

module.exports = { ServerSelectionError, selectServer, sortServers };
