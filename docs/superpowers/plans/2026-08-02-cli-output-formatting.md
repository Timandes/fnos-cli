# CLI Output Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace command-specific plain-text output with a consistent weak-border table renderer and nested field–value renderer while preserving raw JSON exactly.

**Architecture:** Keep `formatOutput(data, raw, options)` as the public entry point, but move scalar formatting, ANSI theming, table layout, and recursive object layout into focused modules under `src/utils/output/`. The command runner supplies an injectable terminal context; the formatter separates request metadata from business data and selects a renderer without knowing individual CLI commands.

**Tech Stack:** Node.js 18+, CommonJS, Mocha, Node strict assertions, `cli-table3@^0.6.5`, `picocolors@^1.1.1`, `string-width@^4.2.3`.

## Global Constraints

- Do not change fnOS SDK response structures, request behavior, command names, parameters, exit codes, or stdout/stderr responsibilities.
- Do not add theme, color, or output-format CLI flags.
- `--raw` must remain exactly `JSON.stringify(data, null, 2)` and must never contain ANSI codes.
- Human-readable output is not a stable machine-readable interface; scripts should use `--raw`.
- Use weak horizontal separators without a full outer border or vertical grid.
- Aggregate table columns from every record in first-seen order; preserve `0`, `false`, empty strings, empty arrays, and empty objects.
- Enable color only for stdout TTY output when `NO_COLOR` is absent and `TERM !== 'dumb'`.
- Unknown or non-TTY widths must not crop content; known TTY widths wrap long cells without losing values.
- Keep unit formatting generic and path-based; do not add command-name-specific branches.
- Runtime dependencies must support Node.js 18 and CommonJS and must not perform runtime network access.
- Commit messages use English Angular/Conventional Commits and never contain `Co-Authored-By`.

## Reference

- Approved design: `docs/superpowers/specs/2026-08-02-cli-output-formatting-design.md`
- Worktree: `/Users/timandes/Projects/fnos/fnos-cli/.worktrees/cli-output-formatting`
- Baseline: `npm test` reports 90 passing tests.

## File Structure

- Modify `package.json` and `package-lock.json` to add the three specialized runtime dependencies for tables, ANSI color, and Unicode display width.
- Create `src/utils/output/values.js` for plain-object detection, field labels, scalar units, number grouping, and safe compact values.
- Create `src/utils/output/theme.js` for explicitly enabled or disabled ANSI functions.
- Create `src/utils/output/tables.js` for record tables, key–value tables, width allocation, wrapping, alignment, and indentation.
- Create `src/utils/output/objects.js` for recursive object/array rendering and grouping.
- Replace `src/utils/formatter.js` with the response-envelope orchestrator while preserving its public export.
- Modify `src/commands/runner.js` to pass deterministic color and width options.
- Create `test/unit/output-values.test.js`, `test/unit/output-tables.test.js`, and `test/unit/formatter.test.js` for focused behavior tests.
- Modify `test/unit/command-runner.test.js` for real runner-to-formatter terminal-context coverage.
- Modify `README.md` to document human output, redirection, `NO_COLOR`, and `--raw`.

---

### Task 1: Generic Values and Explicit ANSI Theme

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/utils/output/values.js`
- Create: `src/utils/output/theme.js`
- Test: `test/unit/output-values.test.js`

**Interfaces:**
- Produces: `humanizeKey(key) -> string`.
- Produces: `formatValue(key, value, path = []) -> string`.
- Produces: `compactValue(value) -> string`.
- Produces: `isPlainObject(value) -> boolean` and `isRecordArray(value) -> boolean`.
- Produces: `createTheme(enabled = false) -> { title, label, muted, success }`, where every property is `(value) -> string`.

- [ ] **Step 1: Write failing value and theme tests**

Create `test/unit/output-values.test.js`:

```js
const assert = require('node:assert/strict');
const { describe, it } = require('mocha');

function optionalRequire(path) {
  try {
    return require(path);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(path)) return {};
    throw error;
  }
}

const values = optionalRequire('../../src/utils/output/values');
const theme = optionalRequire('../../src/utils/output/theme');

describe('output value formatting', () => {
  it('distinguishes zero, false, null, and an empty string', () => {
    assert.equal(typeof values.formatValue, 'function', 'formatValue must be implemented');
    assert.equal(values.formatValue('count', 0), '0');
    assert.equal(values.formatValue('enabled', false), '✗ No');
    assert.equal(values.formatValue('value', null), '—');
    assert.equal(values.formatValue('name', ''), '""');
  });

  it('formats known units from field and parent names without command knowledge', () => {
    assert.equal(values.formatValue('temp', 31, ['disk']), '31°C');
    assert.equal(values.formatValue('user', 2, ['cpu', 'busy']), '2%');
    assert.equal(values.formatValue('maxFreq', 4500, ['cpu']), '4,500 MHz');
    assert.equal(values.formatValue('total', 2147483648, ['mem']), '2.00 GB');
    assert.equal(values.formatValue('read', 2097152, ['storeSpeed']), '2.00 MB/s');
    assert.equal(values.formatValue('temp', [31, 32], ['cpu']), '31°C, 32°C');
    assert.equal(values.formatValue('temp', [], ['cpu']), '[]');
  });

  it('humanizes camelCase and snake_case while preserving common acronyms', () => {
    assert.equal(values.humanizeKey('maxFreq'), 'Max freq');
    assert.equal(values.humanizeKey('cpuBusy'), 'CPU busy');
    assert.equal(values.humanizeKey('store_speed'), 'Store speed');
  });

  it('serializes nested values safely and recognizes record arrays', () => {
    assert.equal(values.compactValue({ nested: true }), '{"nested":true}');
    const circular = {};
    circular.self = circular;
    assert.equal(values.compactValue(circular), '[Circular]');
    assert.equal(values.isRecordArray([{ name: 'one' }, null, { name: 'two' }]), true);
    assert.equal(values.isRecordArray([null, null]), false);
  });
});

describe('output theme', () => {
  it('adds ANSI only when explicitly enabled', () => {
    assert.equal(typeof theme.createTheme, 'function', 'createTheme must be implemented');
    assert.equal(theme.createTheme(false).title('Disk'), 'Disk');
    assert.doesNotMatch(theme.createTheme(false).success('✓ Success'), /\u001b\[/);
    assert.match(theme.createTheme(true).title('Disk'), /\u001b\[/);
    assert.match(theme.createTheme(true).success('✓ Success'), /\u001b\[/);
  });
});
```

The named breaks are: collapsing `false` into the null marker, losing zero, applying the wrong path-based unit, treating all-null arrays as record tables, throwing on circular values, or letting the color library auto-enable ANSI when disabled.

- [ ] **Step 2: Run the tests and verify the expected failure**

Run:

```bash
npx mocha test/unit/output-values.test.js
```

Expected: FAIL on `formatValue must be implemented`; the optional loader must prevent a module-loading error.

- [ ] **Step 3: Install the color dependency**

```bash
npm install picocolors@^1.1.1
```

Verify `picocolors` appears under runtime `dependencies` in `package.json` and the root package entry in `package-lock.json`.

- [ ] **Step 4: Implement `src/utils/output/values.js`**

```js
const BYTE_GROUPS = new Set(['mem', 'swap']);
const BYTE_FIELDS = new Set(['total', 'used', 'free', 'available', 'cached', 'buffers']);
const SPEED_GROUPS = new Set(['storespeed', 'netspeed']);
const PERCENT_FIELDS = new Set(['busy', 'cpubusy', 'mempercent']);

function normalizedName(value) {
  return String(value).replace(/[_\s-]/g, '').toLowerCase();
}

function humanizeKey(key) {
  const words = String(key)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  if (!words) return String(key);
  return (words.charAt(0).toUpperCase() + words.slice(1))
    .replace(/\bcpu\b/gi, 'CPU')
    .replace(/\bgpu\b/gi, 'GPU')
    .replace(/\bnpu\b/gi, 'NPU');
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  const match = String(value).match(/^(-?)(\d+)(\.\d+)?$/);
  if (!match) return String(value);
  const integer = match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${match[1]}${integer}${match[3] || ''}`;
}

function formatBytes(value) {
  return value === 0 ? '0 GB' : `${(value / (1024 ** 3)).toFixed(2)} GB`;
}

function formatSpeed(value) {
  return value === 0 ? '0 MB/s' : `${(value / (1024 ** 2)).toFixed(2)} MB/s`;
}

function formatScalar(key, value, path = []) {
  if (value === null || value === undefined) return '—';
  if (value === '') return '""';
  if (typeof value === 'boolean') return value ? '✓ Yes' : '✗ No';
  if (typeof value !== 'number') return String(value);
  const field = normalizedName(key);
  const group = normalizedName(path[path.length - 1] || '');
  if (BYTE_GROUPS.has(group) && BYTE_FIELDS.has(field)) return formatBytes(value);
  if (SPEED_GROUPS.has(group)) return formatSpeed(value);
  if (field === 'temp' || field === 'temperature' ||
      ((group === 'temp' || group === 'temperature') && /^\d+$/.test(field))) {
    return `${formatNumber(value)}°C`;
  }
  if (PERCENT_FIELDS.has(field) || field.endsWith('percent') ||
      field.endsWith('percentage') || group === 'busy') {
    return `${formatNumber(value)}%`;
  }
  if (field === 'maxfreq') return `${formatNumber(value)} MHz`;
  return formatNumber(value);
}

function compactValue(value) {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? '—' : serialized;
  } catch (error) {
    return '[Circular]';
  }
}

function formatValue(key, value, path = []) {
  const field = normalizedName(key);
  if (Array.isArray(value) && value.length > 0 &&
      (field === 'temp' || field === 'temperature') &&
      value.every(item => typeof item === 'number')) {
    return value.map(item => formatScalar(key, item, path)).join(', ');
  }
  if (typeof value === 'object' && value !== null) return compactValue(value);
  return formatScalar(key, value, path);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isRecordArray(value) {
  return Array.isArray(value) && value.some(isPlainObject) &&
    value.every(item => item === null || isPlainObject(item));
}

module.exports = { compactValue, formatValue, humanizeKey, isPlainObject, isRecordArray };
```

- [ ] **Step 5: Implement `src/utils/output/theme.js`**

```js
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
```

- [ ] **Step 6: Run focused and full tests**

```bash
npx mocha test/unit/output-values.test.js
npm test
```

Expected: focused tests PASS; the full suite reports at least 95 passing tests and zero failures.

- [ ] **Step 7: Commit the value layer**

```bash
git add package.json package-lock.json src/utils/output/values.js src/utils/output/theme.js test/unit/output-values.test.js
git commit -m "feat: add terminal output value formatting"
```

---

### Task 2: Weak-Border Record and Field–Value Tables

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/utils/output/tables.js`
- Test: `test/unit/output-tables.test.js`

**Interfaces:**
- Consumes: `formatValue`, `humanizeKey`, and `createTheme` from Task 1.
- Produces: `renderRecordTable(rows, options = {}) -> string`.
- Produces: `renderKeyValueTable(entries, options = {}) -> string`, where each entry is `{ key: string, value: string }`.
- Both renderers accept `{ color = false, columns, indent = 0, path = [] }`.

- [ ] **Step 1: Write failing table tests**

Create `test/unit/output-tables.test.js`:

```js
const assert = require('node:assert/strict');
const { describe, it } = require('mocha');

function loadTables() {
  try {
    return require('../../src/utils/output/tables');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('../../src/utils/output/tables')) return {};
    throw error;
  }
}

function visibleWidth(value) {
  const plain = value.replace(/\u001b\[[0-9;]*m/g, '');
  return Array.from(plain).reduce((width, character) =>
    width + (/^[\u2e80-\u9fff\uf900-\ufaff\uff01-\uff60]$/.test(character) ? 2 : 1), 0);
}

const tables = loadTables();

describe('output tables', () => {
  it('collects heterogeneous keys and preserves zero and false', () => {
    assert.equal(typeof tables.renderRecordTable, 'function', 'renderRecordTable must be implemented');
    const output = tables.renderRecordTable([
      { name: 'nvme1n1', temp: 31, busy: 0 },
      { name: 'nvme2n1', standby: false, write: 201728 }
    ], { columns: 100, path: ['disk'] });
    assert.match(output, /Name/);
    assert.match(output, /Standby/);
    assert.match(output, /Write/);
    assert.match(output, /31°C/);
    assert.match(output, /0%/);
    assert.match(output, /✗ No/);
    assert.match(output, /201,728/);
  });

  it('uses weak horizontal separators without a full box', () => {
    const output = tables.renderRecordTable([{ name: 'one' }, { name: 'two' }]);
    assert.match(output, /─/);
    assert.doesNotMatch(output, /[┌┐└┘│]/);
  });

  it('right-aligns numeric columns', () => {
    const output = tables.renderRecordTable([
      { name: 'a', read: 2 },
      { name: 'long', read: 1000 }
    ], { columns: 60 });
    const shortRow = output.split('\n').find(line => /^a\s/.test(line));
    const longRow = output.split('\n').find(line => /^long\s/.test(line));
    assert.equal(shortRow.indexOf('2') + 1, longRow.indexOf('1,000') + 5);
  });

  it('wraps Chinese and long values inside a known terminal width', () => {
    const output = tables.renderRecordTable([
      { name: '主存储盘', description: '这是一个很长的磁盘说明字段' }
    ], { columns: 36, path: ['disk'] });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 36, `${visibleWidth(line)}: ${line}`);
    }
    assert.match(output, /主存储盘/);
    assert.match(output.replace(/\s/g, ''), /这是一个很长的磁盘说明字段/);
  });

  it('renders an indented field-value table without vertical borders', () => {
    assert.equal(typeof tables.renderKeyValueTable, 'function', 'renderKeyValueTable must be implemented');
    const output = tables.renderKeyValueTable([
      { key: 'Model', value: 'Intel Core i7-9750H' },
      { key: 'Cores', value: '6' }
    ], { columns: 60, indent: 2 });
    assert.match(output, /^  Model\s+Intel Core i7-9750H$/m);
    assert.match(output, /^  Cores\s+6$/m);
    assert.doesNotMatch(output, /[┌┐└┘│─]/);
  });

  it('does not crop values when terminal width is unknown', () => {
    const longValue = 'x'.repeat(120);
    const output = tables.renderRecordTable([{ name: 'disk', description: longValue }]);
    assert.match(output, new RegExp(longValue));
  });
});
```

The named breaks are: reading only the first row, dropping falsy values, reintroducing a full box, exceeding a known width, losing wrapped Chinese text, or adding borders to object fields.

- [ ] **Step 2: Run the test and verify the expected failure**

```bash
npx mocha test/unit/output-tables.test.js
```

Expected: FAIL on `renderRecordTable must be implemented`.

- [ ] **Step 3: Install the table dependency**

```bash
npm install cli-table3@^0.6.5
```

Verify `cli-table3` is a runtime dependency in `package.json` and the root lockfile package entry.

- [ ] **Step 4: Implement `src/utils/output/tables.js`**

```js
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
  return Array.from(String(value).replace(/\u001b\[[0-9;]*m/g, '')).length;
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
  return value.split('\n').map(line => `${prefix}${line}`).join('\n');
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
```

- [ ] **Step 5: Run focused and full tests**

```bash
npx mocha test/unit/output-tables.test.js
npm test
```

Expected: focused tests PASS; the full suite reports at least 101 passing tests and zero failures.

- [ ] **Step 6: Commit the table layer**

```bash
git add package.json package-lock.json src/utils/output/tables.js test/unit/output-tables.test.js
git commit -m "feat: add responsive terminal tables"
```

---

### Task 3: Recursive Objects and Response Metadata

**Files:**
- Create: `src/utils/output/objects.js`
- Replace: `src/utils/formatter.js:1-366`
- Test: `test/unit/formatter.test.js`

**Interfaces:**
- Consumes: value, theme, and table interfaces from Tasks 1–2.
- Produces: `renderValue(value, options = {}, path = [], depth = 0, seen = new WeakSet()) -> string`.
- Preserves: `formatOutput(data, raw = false, options = {}) -> string` exported from `src/utils/formatter.js`.

- [ ] **Step 1: Write failing formatter behavior tests**

Create `test/unit/formatter.test.js`:

```js
const assert = require('node:assert/strict');
const { describe, it } = require('mocha');
const { formatOutput } = require('../../src/utils/formatter');

const ANSI = /\u001b\[[0-9;]*m/g;

describe('human-readable response formatting', () => {
  it('renders a disk response as a weak table with metadata last', () => {
    const response = {
      num: 2,
      data: {
        disk: [
          { name: 'nvme1n1', temp: 31, busy: 0, read: 0 },
          { name: 'nvme2n1', standby: false, write: 201728 }
        ]
      },
      result: 'succ', reqid: 'disk-1', req: 'appcgi.resmon.disk', rev: '0.1'
    };
    const output = formatOutput(response, false, { color: false, columns: 100 });
    assert.match(output, /Disk \(2\)/);
    assert.match(output, /Standby/);
    assert.match(output, /201,728/);
    assert.doesNotMatch(output, /[┌┐└┘│]/);
    assert.ok(output.indexOf('Disk (2)') < output.indexOf('✓ Success'));
    assert.ok(output.indexOf('✓ Success') < output.indexOf('Request'));
    assert.equal((output.match(/Request/g) || []).length, 1);
    assert.match(output, /appcgi\.resmon\.disk/);
    assert.match(output, /disk-1/);
  });

  it('renders nested CPU fields as groups instead of compact command-specific lines', () => {
    const response = {
      data: {
        cpu: {
          name: 'Intel Core i7-9750H', core: 6, thread: 12, maxFreq: 4500,
          temp: [33],
          busy: { user: 0, system: 0, iowait: 0, all: 0 },
          loadavg: { avg1min: 0.13, avg5min: 0.12, avg15min: 0.09 }
        }
      },
      result: 'succ', reqid: 'cpu-1', req: 'appcgi.resmon.cpu', rev: '0.1'
    };
    const output = formatOutput(response, false, { color: false, columns: 100 });
    assert.match(output, /^CPU$/m);
    assert.match(output, /^  Name\s+Intel Core i7-9750H\s*$/m);
    assert.match(output, /^  Max freq\s+4,500 MHz\s*$/m);
    assert.match(output, /^  Temp\s+33°C\s*$/m);
    assert.match(output, /^  Busy$/m);
    assert.match(output, /^    User\s+0%\s*$/m);
    assert.match(output, /^  Loadavg$/m);
    assert.doesNotMatch(output, /CPU: .*\|/);
  });

  it('keeps empty and falsy top-level responses distinct', () => {
    assert.equal(formatOutput(null), 'No data returned');
    assert.equal(formatOutput(undefined), 'No data returned');
    assert.equal(formatOutput([]), '[]');
    assert.equal(formatOutput(['one', 'two']), '["one","two"]');
    assert.equal(formatOutput({}), '{}');
    assert.equal(formatOutput(''), '""');
    assert.equal(formatOutput(false), '✗ No');
    assert.equal(formatOutput(0), '0');
  });

  it('preserves raw JSON exactly even when color is requested', () => {
    const response = { result: 'succ', data: { enabled: false, count: 0 } };
    assert.equal(
      formatOutput(response, true, { color: true, columns: 20 }),
      JSON.stringify(response, null, 2)
    );
  });

  it('adds ANSI only when the formatter color option is true', () => {
    const response = { data: { hostName: 'nas' }, result: 'succ' };
    assert.doesNotMatch(formatOutput(response, false, { color: false }), ANSI);
    assert.match(formatOutput(response, false, { color: true }), ANSI);
  });

  it('renders circular input safely', () => {
    const circular = {};
    circular.self = circular;
    assert.match(formatOutput(circular), /\[Circular\]/);
  });

  it('preserves empty data and non-success result values', () => {
    const output = formatOutput({ data: {}, errno: 5, result: 'fail' });
    assert.match(output, /^Data$/m);
    assert.match(output, /^  \{\}$/m);
    assert.match(output, /Errno\s+5/);
    assert.match(output, /Result\s+fail/);
    assert.doesNotMatch(output, /✓ Success/);
  });
});
```

The named breaks are: retaining command-specific CPU one-liners, losing later table columns, duplicating metadata, putting metadata before business data, conflating empty or falsy values, changing raw JSON, ignoring explicit color, or recursing forever.

- [ ] **Step 2: Run the tests and verify behavioral failures**

```bash
npx mocha test/unit/formatter.test.js
```

Expected: FAIL because the existing formatter emits a boxed disk table, command-specific CPU lines, `Empty array`, and no explicit color.

- [ ] **Step 3: Implement `src/utils/output/objects.js`**

```js
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
```

- [ ] **Step 4: Replace `src/utils/formatter.js` with envelope orchestration**

```js
const { isPlainObject } = require('./output/values');
const { renderValue } = require('./output/objects');
const { renderKeyValueTable } = require('./output/tables');
const { createTheme } = require('./output/theme');

const METADATA_KEYS = new Set(['result', 'reqid', 'req', 'rev']);

function hasMainData(value) {
  if (Array.isArray(value)) return value.length > 0;
  return isPlainObject(value) && Object.keys(value).length > 0;
}

function splitResponse(data) {
  if (!isPlainObject(data)) return { values: [data], metadata: {} };
  const business = {};
  const metadata = {};
  let mainData;
  let unwrapData = false;
  for (const [key, value] of Object.entries(data)) {
    if (METADATA_KEYS.has(key)) {
      metadata[key] = value;
    } else if (key === 'data' && hasMainData(value)) {
      mainData = value;
      unwrapData = true;
    } else {
      business[key] = value;
    }
  }
  const values = [];
  if (Object.keys(business).length > 0) values.push(business);
  if (unwrapData) values.push(mainData);
  return { values, metadata };
}

function renderMetadata(metadata, options) {
  const theme = createTheme(options.color);
  const chunks = [];
  const entries = [];
  if (metadata.result === 'succ') {
    chunks.push(theme.success('✓ Success'));
  } else if (Object.prototype.hasOwnProperty.call(metadata, 'result')) {
    entries.push({ key: 'Result', value: String(metadata.result) });
  }
  if (Object.prototype.hasOwnProperty.call(metadata, 'req')) {
    entries.push({ key: 'Request', value: String(metadata.req) });
  }
  if (Object.prototype.hasOwnProperty.call(metadata, 'reqid')) {
    entries.push({ key: 'ID', value: String(metadata.reqid) });
  }
  if (Object.prototype.hasOwnProperty.call(metadata, 'rev')) {
    entries.push({ key: 'Rev', value: String(metadata.rev) });
  }
  const details = renderKeyValueTable(entries, options);
  if (details) chunks.push(details);
  return chunks.join('\n');
}

function formatOutput(data, raw = false, options = {}) {
  if (raw) return JSON.stringify(data, null, 2);
  if (data === null || data === undefined) return 'No data returned';
  const context = {
    color: Boolean(options.color),
    columns: Number.isInteger(options.columns) && options.columns > 0
      ? options.columns
      : undefined
  };
  const { values, metadata } = splitResponse(data);
  const chunks = values.map(value => renderValue(value, context)).filter(Boolean);
  const footer = renderMetadata(metadata, context);
  if (footer) {
    if (chunks.length > 0) {
      const dividerWidth = Math.min(40, context.columns || 40);
      chunks.push(createTheme(context.color).muted('─'.repeat(dividerWidth)));
    }
    chunks.push(footer);
  }
  if (chunks.length === 0) return isPlainObject(data) ? '{}' : renderValue(data, context);
  return chunks.join('\n\n');
}

module.exports = { formatOutput };
```

- [ ] **Step 5: Run focused tests and make evidence-driven layout corrections**

```bash
npx mocha test/unit/output-values.test.js test/unit/output-tables.test.js test/unit/formatter.test.js
```

Expected: all focused tests PASS. If whitespace differs, inspect the real output; correct renderer spacing when it violates the approved design. Do not relax assertions that protect hierarchy, order, width, raw JSON, or the absence of box borders.

- [ ] **Step 6: Run the full unit suite**

```bash
npm test
```

Expected: at least 108 passing tests and zero failures.

- [ ] **Step 7: Commit the formatter replacement**

```bash
git add src/utils/formatter.js src/utils/output/objects.js test/unit/formatter.test.js
git commit -m "feat: render structured command output"
```

---

### Task 4: Runner Terminal Context and Color Policy

**Files:**
- Modify: `src/commands/runner.js:7-28`
- Modify: `test/unit/command-runner.test.js:40-62`
- Modify: `test/unit/command-runner.test.js` after the raw-output test.

**Interfaces:**
- Consumes: `formatOutput(data, raw, { color, columns })` from Task 3.
- Adds injectable runner dependencies: `stdoutIsTTY?: boolean`, `stdoutColumns?: number`, and `env?: object`.
- Preserves all existing runner dependencies and return codes.

- [ ] **Step 1: Add failing real-output runner tests**

In the existing “executes a method, formats output, and closes once” test, add these dependencies:

```js
stdoutIsTTY: true,
stdoutColumns: 40,
env: { TERM: 'xterm-256color' }
```

Retain the JSON parse assertion and add:

```js
assert.doesNotMatch(output[0], /\u001b\[/);
```

Add these tests after it:

```js
it('enables styled human output only for an eligible TTY', async () => {
  requireRunner();
  const output = [];
  const client = { close: () => {} };
  const code = await runner.runCommand({
    domain: COMMAND_CATALOG.network,
    definition: COMMAND_CATALOG.network.commands.list,
    options: {}, globalOptions: { raw: false }
  }, {
    resolveCredentials: () => ({ endpoint: 'host:5666', username: 'admin', password: 'pw' }),
    createClient: async () => client,
    getSDKInstance: () => ({ list: async () => ({ data: { hostName: 'nas' }, result: 'succ' }) }),
    stdout: value => output.push(value),
    stderr: () => {},
    stdoutIsTTY: true,
    stdoutColumns: 80,
    env: { TERM: 'xterm-256color' }
  });
  assert.equal(code, 0);
  assert.match(output[0], /\u001b\[/);
});

it('keeps redirected, NO_COLOR, and dumb-terminal output free of ANSI', async () => {
  requireRunner();
  const cases = [
    { stdoutIsTTY: false, env: { TERM: 'xterm-256color' } },
    { stdoutIsTTY: true, env: { TERM: 'xterm-256color', NO_COLOR: '' } },
    { stdoutIsTTY: true, env: { TERM: 'dumb' } }
  ];
  for (const terminal of cases) {
    const output = [];
    const client = { close: () => {} };
    const code = await runner.runCommand({
      domain: COMMAND_CATALOG.network,
      definition: COMMAND_CATALOG.network.commands.list,
      options: {}, globalOptions: { raw: false }
    }, {
      resolveCredentials: () => ({ endpoint: 'host:5666', username: 'admin', password: 'pw' }),
      createClient: async () => client,
      getSDKInstance: () => ({ list: async () => ({ data: { hostName: 'nas' }, result: 'succ' }) }),
      stdout: value => output.push(value),
      stderr: () => {},
      ...terminal
    });
    assert.equal(code, 0);
    assert.doesNotMatch(output[0], /\u001b\[/);
  }
});
```

The named breaks are: coloring redirected output, ignoring an explicitly present empty `NO_COLOR`, coloring `TERM=dumb`, failing to color an eligible TTY, or allowing `--raw` to inherit styling.

- [ ] **Step 2: Run the runner tests and verify the expected failure**

```bash
npx mocha test/unit/command-runner.test.js
```

Expected: FAIL because eligible TTY human output has no ANSI yet.

- [ ] **Step 3: Pass terminal context from `src/commands/runner.js`**

Add this helper above `runCommand`:

```js
function outputOptions(raw, dependencies) {
  const env = dependencies.env || process.env;
  const stdoutIsTTY = dependencies.stdoutIsTTY === undefined
    ? Boolean(process.stdout.isTTY)
    : Boolean(dependencies.stdoutIsTTY);
  const stdoutColumns = dependencies.stdoutColumns === undefined
    ? process.stdout.columns
    : dependencies.stdoutColumns;
  const color = !raw && stdoutIsTTY &&
    !Object.prototype.hasOwnProperty.call(env, 'NO_COLOR') &&
    env.TERM !== 'dumb';
  return {
    color,
    columns: stdoutIsTTY && Number.isInteger(stdoutColumns) && stdoutColumns > 0
      ? stdoutColumns
      : undefined
  };
}
```

Replace the existing formatting call with:

```js
const raw = Boolean(context.globalOptions.raw);
stdout(formatOutput(result, raw, outputOptions(raw, dependencies)));
```

Do not export `outputOptions`; tests exercise real command output rather than an implementation helper.

- [ ] **Step 4: Run focused and full tests**

```bash
npx mocha test/unit/command-runner.test.js test/unit/formatter.test.js
npm test
```

Expected: focused and full suites PASS with zero failures.

- [ ] **Step 5: Commit runner integration**

```bash
git add src/commands/runner.js test/unit/command-runner.test.js
git commit -m "feat: adapt output to terminal context"
```

---

### Task 5: User Documentation and Final Verification

**Files:**
- Modify: `README.md:99-115`

**Interfaces:**
- Documents the behavior delivered by Tasks 1–4; no new runtime interface.

- [ ] **Step 1: Update the README output guidance**

Replace the sentence before the redirection example with:

```markdown
默认输出面向人类阅读：对象数组显示为表格，普通对象显示为分层的字段—值布局。交互终端会根据可用宽度自动换行并使用克制配色；管道、文件重定向、`TERM=dumb` 或设置 `NO_COLOR` 时不会输出 ANSI 色码。

命令结果写入 stdout，日志写入 stderr。脚本和机器解析应使用 `--raw` 获取原始 JSON：
```

Keep the existing command example unchanged. This is human-facing prose, so verify it by review rather than adding a source-text assertion.

- [ ] **Step 2: Run formatter demonstrations with fixed responses**

Run the disk example:

```bash
node -e "const {formatOutput}=require('./src/utils/formatter'); console.log(formatOutput({num:2,data:{disk:[{name:'nvme1n1',temp:31,standby:false,busy:2,read:0,write:201728},{name:'nvme2n1',temp:40,standby:false,busy:0,read:0,write:0}]},result:'succ',reqid:'disk-1',req:'appcgi.resmon.disk',rev:'0.1'},false,{color:false,columns:100}))"
```

Confirm visually: weak horizontal separators, no outer box, numeric alignment, `31°C`, `2%`, `✗ No`, `201,728`, and metadata after the table.

Run the object example:

```bash
node -e "const {formatOutput}=require('./src/utils/formatter'); console.log(formatOutput({data:{cpu:{name:'Intel Core i7-9750H',core:6,thread:12,maxFreq:4500,temp:[33],busy:{user:0,system:0,iowait:0,all:0},loadavg:{avg1min:0.13,avg5min:0.12,avg15min:0.09}}},result:'succ',reqid:'cpu-1',req:'appcgi.resmon.cpu',rev:'0.1'},false,{color:false,columns:100}))"
```

Confirm visually: CPU, Busy, and Loadavg are separate hierarchy levels; field values align; no command-specific pipe-delimited line remains.

- [ ] **Step 3: Run full verification**

```bash
npm test
npm pack --dry-run
git diff --check
git status --short
```

Expected:

- `npm test`: zero failures.
- `npm pack --dry-run`: exits 0 and includes `src/utils/output/*.js` through the existing `src/` package entry.
- `git diff --check`: exits 0 with no whitespace errors.
- `git status --short`: only the intended README modification remains before the documentation commit.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md
git commit -m "docs: explain structured terminal output"
```

- [ ] **Step 5: Verify the committed branch from a clean state**

```bash
npm test
git diff --check main...HEAD
git status --short --branch
git log --format='%h %s%n%b' main..HEAD
```

Expected:

- All unit tests pass with zero failures.
- The worktree is clean on `feature/cli-output-formatting`.
- Every feature commit uses an English Conventional Commit subject.
- No commit body contains `Co-Authored-By`.
