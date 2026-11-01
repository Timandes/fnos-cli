const stringWidth = require('string-width');
const { hardWrap } = require('../utils/output/tables');

/** Wrap prose by display width while keeping ordinary identifiers and words intact. */
function wrapParagraph(value, columns) {
  const width = Number.isInteger(columns) && columns > 2 ? columns - 2 : 78;
  // Keep ASCII identifiers together and bind Chinese closing punctuation to a character.
  const tokens = value.match(/[A-Za-z0-9_./<>{}\[\]:@=-]+(?:['’][A-Za-z]+)?[，。；：！？、）】》,;!?)]*|[^\S\n]+|[^\s][，。；：！？、）】》,;!?)]*/gu) || [];
  const lines = [];
  let line = '';
  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      if (line && stringWidth(line) < width) line += ' ';
      continue;
    }
    if (stringWidth(line + token) > width && line.trim()) {
      lines.push(line.trimEnd());
      line = '';
    }
    if (stringWidth(token) > width) {
      const parts = hardWrap(token, width).split('\n');
      lines.push(...parts.slice(0, -1));
      line = parts.at(-1);
    } else line += token;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.map(part => `  ${part}`).join('\n');
}

module.exports = { wrapParagraph };
