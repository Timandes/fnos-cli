const picocolors = require('picocolors');

function createTheme(enabled = false) {
  const colors = picocolors.createColors(Boolean(enabled));
  const stringify = value => String(value);
  return Object.freeze({
    title: value => colors.bold(colors.cyan(stringify(value))),
    label: value => colors.dim(stringify(value)),
    muted: value => colors.dim(stringify(value)),
    success: value => colors.green(stringify(value))
  });
}

module.exports = { createTheme };
