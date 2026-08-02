const Table = require('cli-table3');
const { formatValue, humanizeKey } = require('./values');
const { createTheme } = require('./theme');

const WEAK_CHARS = {
  top: '', 'top-mid': '', 'top-left': '', 'top-right': '',
  bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
  left: '', 'left-mid': '', mid: '─', 'mid-mid': '  ',
  right: '', 'right-mid': '', middle: '  '
};

const PLAIN_CHARS = {
  top: '', 'top-mid': '', 'top-left': '', 'top-right': '',
  bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
  left: '', 'left-mid': '', mid: '', 'mid-mid': '',
  right: '', 'right-mid': '', middle: '  '
};

const TABLE_STYLE = {
  head: [], border: [], 'padding-left': 0, 'padding-right': 0
};

function textLength(value) {
  return Array.from(String(value).replace(/\u001b\[[0-9;]*m/g, '')).reduce(
    (width, character) => width +
      (/^[\u2e80-\u9fff\uf900-\ufaff\uff01-\uff60]$/.test(character) ? 2 : 1),
    0
  );
}

function fitWidths(desired, columns, indent, gapWidth) {
  if (!Number.isInteger(columns) || columns <= 0) return undefined;
  const budget = Math.max(desired.length, columns - indent - gapWidth);
  const widths = desired.map(width => Math.max(1, width));
  while (widths.reduce((sum, width) => sum + width, 0) > budget) {
    const widest = widths.reduce((best, width, index) =>
      width > widths[best] ? index : best, 0);
    if (widths[widest] === 1) break;
    widths[widest] -= 1;
  }
  return widths;
}

function indentLines(value, indent) {
  const prefix = ' '.repeat(indent);
  return value.split('\n').map(line => `${prefix}${line.trimEnd()}`).join('\n');
}

function collectKeys(rows) {
  const seen = new Set();
  const keys = [];
  for (const row of rows) {
    if (!row) continue;
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

function renderRecordTable(rows, options = {}) {
  const { color = false, columns, indent = 0, path = [] } = options;
  const theme = createTheme(color);
  const keys = collectKeys(rows);
  if (keys.length === 0) return indentLines('[]', indent);
  const formattedRows = rows.map(row => keys.map(key =>
    row && Object.prototype.hasOwnProperty.call(row, key)
      ? formatValue(key, row[key], path)
      : '—'));
  const labels = keys.map(humanizeKey);
  const desired = keys.map((key, index) => Math.max(
    textLength(labels[index]),
    ...formattedRows.map(row => textLength(row[index]))
  ));
  const widths = fitWidths(desired, columns, indent, (keys.length - 1) * 2);
  const numericColumns = keys.map(key => rows
    .filter(row => row && Object.prototype.hasOwnProperty.call(row, key))
    .every(row => typeof row[key] === 'number'));
  const table = new Table({
    head: labels.map(theme.label),
    chars: WEAK_CHARS,
    style: TABLE_STYLE,
    colAligns: numericColumns.map(numeric => numeric ? 'right' : 'left'),
    wordWrap: true,
    ...(widths ? { colWidths: widths } : {})
  });
  for (const row of formattedRows) table.push(row);
  return indentLines(table.toString(), indent);
}

function renderKeyValueTable(entries, options = {}) {
  const { color = false, columns, indent = 0 } = options;
  if (entries.length === 0) return '';
  const theme = createTheme(color);
  const desiredLabel = Math.min(24, Math.max(...entries.map(entry => textLength(entry.key))));
  const desiredValue = Math.max(...entries.map(entry => textLength(entry.value)));
  const widths = fitWidths([desiredLabel, desiredValue], columns, indent, 2);
  const table = new Table({
    chars: PLAIN_CHARS,
    style: TABLE_STYLE,
    colAligns: ['left', 'left'],
    wordWrap: true,
    ...(widths ? { colWidths: widths } : {})
  });
  for (const entry of entries) table.push([theme.label(entry.key), entry.value]);
  return indentLines(table.toString(), indent);
}

module.exports = { renderKeyValueTable, renderRecordTable };
