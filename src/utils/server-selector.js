const readline = require('node:readline/promises');

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
  return [...servers].sort((left, right) => {
    if (left.name === 'default') return right.name === 'default' ? 0 : -1;
    if (right.name === 'default') return 1;
    if (left.name < right.name) return -1;
    if (left.name > right.name) return 1;
    return 0;
  });
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
      `  ${index + 1}) ${server.name}  ${server.endpoint}  (${server.username})\n`
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
