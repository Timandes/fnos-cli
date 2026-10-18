const fs = require('node:fs');
const path = require('node:path');
const { COMMAND_CATALOG, COMMAND_COUNT, DOMAIN_COUNT } = require('../src/commands/catalog');

function displayDefault(value) {
  if (value === undefined) return '';
  return ` Default: \`${JSON.stringify(value)}\`.`;
}

function renderCommandReference() {
  const lines = [
    '# Command Reference',
    '',
    `fnos-cli exposes ${COMMAND_COUNT} commands across ${DOMAIN_COUNT} domains.`,
    '',
    '## Authentication Commands',
    '',
    '- `fnos login -e <endpoint> -u <username> -p <password>`: password login (default).',
    '- `fnos login --auth oauth --server <name> -e https://<host>:<port>`: interactive browser authorization and code entry.',
    '- `--verify-ssl` enables strict HTTPS certificate verification; login saves the policy with that server. Verification is disabled by default, including for older OAuth records.',
    '- HTTP origins work without an extra flag; `--verify-ssl` requires an HTTPS origin for OAuth.',
    '- `fnos auth.status --server <name> [--raw]`: local metadata only; does not verify server access.',
    '- `fnos logout --server <name>`: clear the selected local credential record.',
    '',
    'Saved servers choose their authentication transport automatically. Existing records without `authType` use password authentication. OAuth login requires a TTY; business commands reuse and refresh saved sessions without prompting.',
    '',
    '## Shared Authentication Options',
    '',
    'Every business command accepts these authentication options.',
    '',
    '| Option | Description |',
    '|---|---|',
    '| `-s, --server <name>` | Saved server name. |',
    '| `-e, --endpoint <endpoint>` | Temporary server endpoint. |',
    '| `-u, --username <username>` | Temporary username. |',
    '| `-p, --password <password>` | Temporary password. |',
    '| `--twofa-code <code>` | Six-digit two-factor code. |',
    '| `--trust-device` | Trust this device after two-factor login. |',
    '| `--verify-ssl` | Verify HTTPS/WSS certificates; login saves the policy. Default: disabled. |',
    '',
    '`--server` cannot be combined with `-e`, `-u`, or `-p`. ' +
      'Temporary endpoint, username, and password must be supplied together.',
    ''
  ];
  for (const [domainName, domain] of Object.entries(COMMAND_CATALOG)) {
    lines.push(`## ${domainName}`, '');
    for (const [commandName, definition] of Object.entries(domain.commands)) {
      lines.push(`### \`${domainName}.${commandName}\``, '', definition.description, '');
      if (definition.options.length === 0) {
        lines.push('No business options.', '');
      } else {
        lines.push('| Option | Required | Type | Description |', '|---|---:|---|---|');
        for (const option of definition.options) {
          lines.push(`| \`${option.flag}\` | ${option.required ? 'yes' : 'no'} | ${option.type} | ${option.description}.${displayDefault(option.defaultValue)} |`);
        }
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}

if (require.main === module) {
  fs.writeFileSync(path.resolve(__dirname, '../docs/commands.md'), renderCommandReference());
}

module.exports = { renderCommandReference };
