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
    '## Help and Command Syntax',
    '',
    'Use `fnos --help` to list command groups, `fnos user --help` to list user commands, ' +
      'and `fnos user getPreference --help` to inspect command-specific options.',
    'Each level includes its available global options. Business groups and commands also show authentication options.',
    '',
    'Business commands use `fnos <domain> <command> [options]`. ' +
      'Existing dotted calls such as `fnos user.info` remain supported but are hidden from top-level help and completion.',
    '',
    '## Shared Authentication Options',
    '',
    'Every business command accepts these authentication options.',
    'They can appear before or after the subcommand, for example ' +
      '`fnos user --server office info` or `fnos user info --server office`.',
    '',
    '| Option | Description |',
    '|---|---|',
    '| `-s, --server <name>` | Saved server name. |',
    '| `-e, --endpoint <endpoint>` | Temporary server endpoint. |',
    '| `-u, --username <username>` | Temporary username. |',
    '| `-p, --password <password>` | Temporary password. |',
    '| `--twofa-code <code>` | Six-digit two-factor code. |',
    '| `--trust-device` | Trust this device after two-factor login. |',
    '| `--verify-ssl` | Verify the WSS server certificate. |',
    '',
    '`--server` cannot be combined with `-e`, `-u`, or `-p`. ' +
      'Temporary endpoint, username, and password must be supplied together.',
    ''
  ];
  for (const [domainName, domain] of Object.entries(COMMAND_CATALOG)) {
    lines.push(`## ${domainName}`, '', domain.description, '');
    for (const [commandName, definition] of Object.entries(domain.commands)) {
      lines.push(`### \`${domainName} ${commandName}\``, '', definition.description, '');
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
