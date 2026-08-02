const Table = require('cli-table3');
const stringWidth = require('string-width');
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

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function textLength(value) {
  return stringWidth(String(value));
}

function graphemes(value) {
  return Array.from(graphemeSegmenter.segment(String(value)), part => part.segment);
}

function minimumWidth(value) {
  return Math.max(1, ...graphemes(value).map(stringWidth));
}

function hardWrap(value, width) {
  if (!width) return String(value);
  const lines = [];
  for (const inputLine of String(value).split('\n')) {
    let line = '';
    let lineWidth = 0;
    for (const grapheme of graphemes(inputLine)) {
      const graphemeWidth = stringWidth(grapheme);
      if (lineWidth > 0 && lineWidth + graphemeWidth > width) {
        lines.push(line);
        line = '';
        lineWidth = 0;
      }
      line += grapheme;
      lineWidth += graphemeWidth;
    }
    lines.push(line);
  }
  return lines.join('\n');
}

function fitWidths(desired, minimums, columns, indent, gapWidth) {
  if (!Number.isInteger(columns) || columns <= 0) return undefined;
  const budget = columns - indent - gapWidth;
  if (budget < minimums.reduce((sum, width) => sum + width, 0)) return null;
  const widths = desired.map((width, index) => Math.max(minimums[index], width));
  while (widths.reduce((sum, width) => sum + width, 0) > budget) {
    const widest = widths.reduce((best, width, index) =>
      width > widths[best] ? index : best, 0);
    if (widths[widest] === minimums[widest]) break;
    widths[widest] -= 1;
  }
  return widths;
}

function indentLines(value, indent) {
  const prefix = ' '.repeat(indent);
  return value.split('\n').map(line => `${prefix}${line.trimEnd()}`).join('\n');
}

function fallbackIndent(indent, columns) {
  return Math.min(indent, Math.max(0, columns - 1));
}

function renderStackedEntries(groups, options, theme) {
  const { columns, indent = 0 } = options;
  const safeIndent = fallbackIndent(indent, columns);
  const width = columns - safeIndent;
  const lines = [];
  for (const [groupIndex, entries] of groups.entries()) {
    if (groupIndex > 0) lines.push('─'.repeat(width));
    for (const entry of entries) {
      lines.push(theme.label(hardWrap(entry.key, width)));
      lines.push(hardWrap(entry.value, width));
    }
  }
  return indentLines(lines.join('\n'), safeIndent);
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
  const minimums = keys.map((key, index) => Math.max(
    minimumWidth(labels[index]),
    ...formattedRows.map(row => minimumWidth(row[index]))
  ));
  const widths = fitWidths(desired, minimums, columns, indent, (keys.length - 1) * 2);
  if (widths === null) {
    return renderStackedEntries(formattedRows.map(row => keys.map((key, index) => ({
      key: labels[index], value: row[index]
    }))), options, theme);
  }
  const numericColumns = keys.map(key => rows
    .filter(row => row && Object.prototype.hasOwnProperty.call(row, key))
    .every(row => typeof row[key] === 'number'));
  const table = new Table({
    head: labels.map((label, index) => theme.label(widths ? hardWrap(label, widths[index]) : label)),
    chars: WEAK_CHARS,
    style: TABLE_STYLE,
    colAligns: numericColumns.map(numeric => numeric ? 'right' : 'left'),
    wordWrap: true,
    ...(widths ? { colWidths: widths } : {})
  });
  for (const row of formattedRows) {
    table.push(widths ? row.map((value, index) => hardWrap(value, widths[index])) : row);
  }
  return indentLines(table.toString(), indent);
}

function renderKeyValueTable(entries, options = {}) {
  const { color = false, columns, indent = 0 } = options;
  if (entries.length === 0) return '';
  const theme = createTheme(color);
  const desiredLabel = Math.min(24, Math.max(...entries.map(entry => textLength(entry.key))));
  const desiredValue = Math.max(...entries.map(entry => textLength(entry.value)));
  const minimums = [
    Math.max(...entries.map(entry => minimumWidth(entry.key))),
    Math.max(...entries.map(entry => minimumWidth(entry.value)))
  ];
  const widths = fitWidths([desiredLabel, desiredValue], minimums, columns, indent, 2);
  if (widths === null) return renderStackedEntries([entries], options, theme);
  const table = new Table({
    chars: PLAIN_CHARS,
    style: TABLE_STYLE,
    colAligns: ['left', 'left'],
    wordWrap: true,
    ...(widths ? { colWidths: widths } : {})
  });
  for (const entry of entries) {
    table.push(widths
      ? [theme.label(hardWrap(entry.key, widths[0])), hardWrap(entry.value, widths[1])]
      : [theme.label(entry.key), entry.value]);
  }
  return indentLines(table.toString(), indent);
}

module.exports = { renderKeyValueTable, renderRecordTable };
