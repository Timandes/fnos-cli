const { formatValue, humanizeKey, isPlainObject, isRecordArray } = require('./values');
const { createTheme } = require('./theme');
const { renderKeyValueTable, renderRecordTable, wrapIndentedText } = require('./tables');

function renderTitle(title, indent, options) {
  const theme = createTheme(options.color);
  const wrapped = wrapIndentedText(title, indent, options.columns);
  const prefix = ' '.repeat(wrapped.indent);
  return wrapped.lines.map(line => `${prefix}${theme.title(line)}`).join('\n');
}

function renderObject(object, options, path, depth, seen) {
  if (seen.has(object)) return `${' '.repeat(depth * 2)}[Circular]`;
  const keys = Object.keys(object);
  if (keys.length === 0) return `${' '.repeat(depth * 2)}{}`;
  seen.add(object);
  const blocks = [];
  let fields = [];

  function flushFields() {
    if (fields.length === 0) return;
    blocks.push(renderKeyValueTable(fields, { ...options, indent: depth * 2 }));
    fields = [];
  }

  for (const [key, value] of Object.entries(object)) {
    const nextPath = [...path, key];
    if (isRecordArray(value)) {
      flushFields();
      const title = `${humanizeKey(key)} (${value.length})`;
      blocks.push([
        renderTitle(title, depth * 2, options),
        renderRecordTable(value, { ...options, indent: (depth + 1) * 2, path: nextPath })
      ].join('\n'));
    } else if (isPlainObject(value)) {
      flushFields();
      const title = renderTitle(humanizeKey(key), depth * 2, options);
      blocks.push(`${title}\n${renderObject(value, options, nextPath, depth + 1, seen)}`);
    } else {
      fields.push({ key: humanizeKey(key), value: formatValue(key, value, path) });
    }
  }
  flushFields();
  seen.delete(object);
  return blocks.join('\n\n');
}

function renderValue(value, options = {}, path = [], depth = 0, seen = new WeakSet()) {
  if (isRecordArray(value)) {
    return renderRecordTable(value, { ...options, indent: depth * 2, path });
  }
  if (isPlainObject(value)) return renderObject(value, options, path, depth, seen);
  const key = path[path.length - 1] || '';
  return `${' '.repeat(depth * 2)}${formatValue(key, value, path.slice(0, -1))}`;
}

module.exports = { renderValue };
