const { t } = require('../i18n');
const { spawn } = require('node:child_process');

/** Ask the OS to open a URL without a shell or browser output in the CLI. */
function openBrowser(url, dependencies = {}) {
  const platform = dependencies.platform || process.platform;
  const start = dependencies.spawn || spawn;
  let command;
  let args;
  if (platform === 'darwin') { command = 'open'; args = [url]; }
  else if (platform === 'win32') { command = 'rundll32.exe'; args = ['url.dll,FileProtocolHandler', url]; }
  else if (platform === 'linux') { command = 'xdg-open'; args = [url]; }
  else return Promise.reject(new Error(t('No browser opener is available for this platform.')));

  return new Promise((resolve, reject) => {
    const child = start(command, args, { shell: false, stdio: 'ignore', detached: true });
    let settled = false;
    let timer;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.unref();
      if (error) reject(error); else resolve();
    };
    child.once('error', finish);
    child.once('exit', code => finish(code === 0 ? null : new Error(t('The browser opener failed.'))));
    // Some Linux openers stay attached to the browser. Do not wait for or kill it.
    timer = setTimeout(() => finish(), 1000);
  });
}

module.exports = { openBrowser };
