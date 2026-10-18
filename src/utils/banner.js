const { createTheme } = require('./output/theme');

const LOGO = String.raw`   __        ___  ____     ____ _     ___
  / _|_ __  / _ \/ ___|   / ___| |   |_ _|
 | |_| '_ \| | | \___ \  | |   | |    | |
 |  _| | | | |_| |___) | | |___| |___ | |
 |_| |_| |_|\___/|____/   \____|_____|___|`;
const LOGO_WIDTH = Math.max(...LOGO.split('\n').map(line => line.length));

/**
 * Show one terminal-only logo before command actions or help output.
 * @param {import('commander').Command} program - Root CLI command.
 * @param {object} dependencies - Output and terminal overrides.
 */
function registerBanner(program, dependencies = {}) {
    const stdout = dependencies.stdout || console.log;
    let displayed = false;

    function renderOnce() {
        const isTTY = dependencies.stdoutIsTTY === undefined
            ? Boolean(process.stdout.isTTY)
            : Boolean(dependencies.stdoutIsTTY);
        if (displayed || !isTTY || program.opts().raw) return '';

        const env = dependencies.env || process.env;
        const columns = dependencies.stdoutColumns === undefined
            ? process.stdout.columns
            : dependencies.stdoutColumns;
        const compact = Number.isInteger(columns) && columns > 0 && columns < LOGO_WIDTH;
        const color = !Object.prototype.hasOwnProperty.call(env, 'NO_COLOR') && env.TERM !== 'dumb';
        displayed = true;
        return `${createTheme(color).title(compact ? 'fnOS CLI' : LOGO)}\n`;
    }

    program.addHelpText('beforeAll', renderOnce);
    program.hook('preAction', (_root, command) => {
        // Completion source is executable shell code, including when stdout is a TTY.
        if (command.name() === 'completion' && command.processedArgs[0] !== undefined) return;
        const banner = renderOnce();
        if (banner) stdout(banner);
    });
}

module.exports = { registerBanner };
