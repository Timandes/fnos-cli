const settings = require('../utils/settings');
const { Argument } = require('commander');
const { fixedValues, withCompletion } = require('../completion/metadata');
const { isLanguage, SUPPORTED_LANGUAGES } = require('../i18n/languages');
const { t } = require('../i18n');
const { CommandParameterError } = require('./options');
const { errorMessage } = require('../utils/errors');

/** Register the small, non-sensitive configuration surface. */
function registerConfigCommand(program, dependencies = {}) {
  const store = dependencies.settings || settings;
  const stdout = dependencies.stdout || console.log;
  const stderr = dependencies.stderr || console.error;
  const group = program.command('config').description('Manage CLI preferences');
  group.action(() => { if (group.args.length) group.unknownCommand(); else group.outputHelp(); });
  for (const operation of ['get', 'set', 'unset']) {
    const command = group.command(operation).description({
      get: 'Show the saved and effective language', set: 'Save a language preference', unset: 'Clear the saved language preference'
    }[operation]).allowExcessArguments(false);
    command.addArgument(withCompletion(new Argument('<key>', 'Preference key'), fixedValues(['language'])));
    if (operation === 'set') command.addArgument(withCompletion(new Argument('<locale>', 'Language'), fixedValues(SUPPORTED_LANGUAGES)));
    command.action((key, locale) => {
      try {
        if (key !== 'language') throw new CommandParameterError(t('Only the language preference is supported.'));
        let result;
        if (operation === 'get') {
          const language = store.getLanguage();
          const selection = program.languageSelection;
          result = { language, effectiveLanguage: selection.language, source: selection.source };
        } else if (operation === 'set') {
          if (!isLanguage(locale)) throw new CommandParameterError(t('Language must be zh-CN or en.'));
          store.setLanguage(locale);
          result = { language: locale };
        } else {
          store.clearLanguage();
          result = { language: null };
        }
        stdout(program.opts().raw ? JSON.stringify(result, null, 2) : Object.entries(result).map(([name, value]) =>
          `${t({ language: 'Language', effectiveLanguage: 'Effective language', source: 'Source' }[name])}: ${name === 'source' ? t(value) : value ?? '—'}`).join('\n'));
        process.exitCode = 0;
      } catch (error) {
        stderr(t('Error: {message}', { message: errorMessage(error) }));
        process.exitCode = error.exitCode || 1;
      }
    });
  }
}

module.exports = { registerConfigCommand };
