const { formatValue, humanizeKey, isPlainObject, isRecordArray } = require('./values');
const { createTheme } = require('./theme');
const { renderKeyValueTable, renderRecordTable } = require('./tables');

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
        `${' '.repeat(depth * 2)}${createTheme(options.color).title(title)}`,
        renderRecordTable(value, { ...options, indent: (depth + 1) * 2, path: nextPath })
      ].join('\n'));
    } else if (isPlainObject(value)) {
      flushFields();
      const title = `${' '.repeat(depth * 2)}${createTheme(options.color).title(humanizeKey(key))}`;
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
