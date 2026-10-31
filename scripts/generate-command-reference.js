const { withLanguage, t } = require('../src/i18n');
const fs = require('node:fs');
const path = require('node:path');
const { COMMAND_CATALOG, COMMAND_COUNT, DOMAIN_COUNT } = require('../src/commands/catalog');

function displayDefault(value) {
  if (value === undefined) return '';
  return ` Default: \`${JSON.stringify(value)}\`.`;
}

function renderEnglishReference() {
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
    'Running bare `fnos` or only a language option such as `fnos --lang en` writes help to stderr and exits with code 1. Explicit `--help` writes to stdout and exits with code 0.',
    '',
    'Business commands use `fnos <domain> <command> [options]`. ' +
      'Existing dotted calls such as `fnos user.info` remain supported but are hidden from top-level help and completion.',
    '',
    '## Language and Preferences',
    '',
    'The default display language is Simplified Chinese (`zh-CN`); English is `en`.',
    'Priority: `--lang <locale>` > `FNOS_LANG` > saved `language` preference > `zh-CN`.',
    'Use `fnos --lang en user --help` or `FNOS_LANG=en fnos user info` for a temporary override.',
    '',
    '- `fnos config set language en`: save a preference without changing credentials.',
    '- `fnos config get language [--raw]`: show the saved language, effective language, and source.',
    '- `fnos config unset language`: clear the preference. Overrides still apply.',
    '',
    'Preferences live at the top level of `~/.fnos/settings.json`. JSON output, command names, option names, and server messages are not translated.',
    'After changing languages, run `fnos completion install zsh` again to update static completion descriptions.',
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
    '| `--verify-ssl` | Verify HTTPS/WSS certificates; login saves the policy. Default: disabled. |',
    '',
    '`--server` cannot be combined with `-e`, `-u`, or `-p`. ' +
      'Temporary endpoint, username, and password must be supplied together.',
    ''
  ];
  for (const [domainName, domain] of Object.entries(COMMAND_CATALOG)) {
    lines.push(`## ${domainName}`, '', t(domain.description), '');
    for (const [commandName, definition] of Object.entries(domain.commands)) {
      lines.push(`### \`${domainName} ${commandName}\``, '', t(definition.description), '');
      if (definition.options.length === 0) {
        lines.push('No business options.', '');
      } else {
        lines.push('| Option | Required | Type | Description |', '|---|---:|---|---|');
        for (const option of definition.options) {
          lines.push(`| \`${option.flag}\` | ${option.required ? 'yes' : 'no'} | ${option.type} | ${t(option.description)}.${displayDefault(option.defaultValue)} |`);
        }
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}

/** Generate a stable English reference independent of the invocation language. */
function renderCommandReference() {
  return withLanguage('en', renderEnglishReference);
}

if (require.main === module) {
  fs.writeFileSync(path.resolve(__dirname, '../docs/commands.md'), renderCommandReference());
}

module.exports = { renderCommandReference };
