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
