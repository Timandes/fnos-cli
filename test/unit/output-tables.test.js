const assert = require('node:assert/strict');
const { stripVTControlCharacters } = require('node:util');
const { describe, it } = require('mocha');
const stringWidth = require('string-width');

function loadTables() {
  try {
    return require('../../src/utils/output/tables');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('../../src/utils/output/tables')) return {};
    throw error;
  }
}

function visibleWidth(value) {
  return stringWidth(stripVTControlCharacters(value));
}

function compactOutput(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '').replace(/[\s─]/g, '');
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

  it('keeps a numeric column right-aligned when records contain missing values', () => {
    const output = tables.renderRecordTable([
      { name: 'a', count: 2 },
      { name: 'long', count: 1000 },
      { name: 'empty', count: null },
      { name: 'absent' }
    ], { columns: 60 });
    const shortRow = output.split('\n').find(line => /^a\s/.test(line));
    const longRow = output.split('\n').find(line => /^long\s/.test(line));
    assert.equal(shortRow.indexOf('2') + 1, longRow.indexOf('1,000') + 5, output);
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

  it('hard-wraps unbroken ASCII and Chinese values without ellipsizing them', () => {
    const ascii = 'a'.repeat(48);
    const chinese = '这是没有空格的很长中文说明字段'.repeat(2);
    const output = tables.renderRecordTable([
      { description: ascii },
      { description: chinese }
    ], { columns: 16 });
    assert.ok(output.split('\n').length > 4, output);
    assert.ok(compactOutput(output).includes(ascii), output);
    assert.ok(compactOutput(output).includes(chinese), output);
    assert.doesNotMatch(output, /…/);
  });

  it('uses Unicode display width for CJK extensions and emoji in narrow columns', () => {
    const cjkExtension = '𠀀'.repeat(12);
    const emoji = '😀'.repeat(12);
    const output = tables.renderRecordTable([
      { description: cjkExtension },
      { description: emoji }
    ], { columns: 16 });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 16, `${visibleWidth(line)}: ${line}`);
    }
    assert.ok(compactOutput(output).includes(cjkExtension), output);
    assert.ok(compactOutput(output).includes(emoji), output);
    assert.doesNotMatch(output, /…/);
  });

  it('falls back safely when four double-width columns cannot fit', () => {
    const value = '𠀀';
    const output = tables.renderRecordTable([
      { a: value, b: value, c: value, d: value }
    ], { columns: 12 });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 12, `${visibleWidth(line)}: ${line}`);
    }
    assert.equal(compactOutput(output).replace(/[ABCD]/g, ''), value.repeat(4), output);
    assert.doesNotMatch(output, /…/);
  });

  it('keeps ZWJ emoji grapheme clusters intact in narrow columns', () => {
    const family = '👨‍👩‍👧‍👦';
    const output = tables.renderRecordTable([{ value: family }], { columns: 14 });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 14, `${visibleWidth(line)}: ${line}`);
    }
    assert.ok(output.includes(family), output);
    assert.ok(compactOutput(output).includes(family), output);
    assert.doesNotMatch(output, /…/);
  });

  it('shrinks a record column that remains above its safe minimum', () => {
    const output = tables.renderRecordTable([{ a: '𠀀', b: 'xx' }], { columns: 5 });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 5, `${visibleWidth(line)}: ${line}`);
    }
    assert.equal(compactOutput(output).replace(/[AB]/g, ''), '𠀀xx', output);
    assert.doesNotMatch(output, /…/);
  });

  it('shrinks a field-value column that remains above its safe minimum', () => {
    const output = tables.renderKeyValueTable([{ key: '𠀀', value: 'xx' }], { columns: 5 });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 5, `${visibleWidth(line)}: ${line}`);
    }
    assert.equal(compactOutput(output), '𠀀xx', output);
    assert.doesNotMatch(output, /…/);
  });

  it('removes terminal control sequences from direct field-value entries before wrapping', () => {
    const value = 'AB\u001b[31m中文CD\u001b[0m';
    const output = tables.renderKeyValueTable([
      { key: 'K\u001b[35m', value }
    ], { columns: 6, color: false });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 6, `${visibleWidth(line)}: ${line}`);
    }
    assert.doesNotMatch(output, /\u001b|\[31m|\[0m|\[35m/);
    assert.ok(output.replace(/\s/g, '').includes('KAB中文CD'), output);
  });

  it('removes C1 OSC and DCS sequences from direct field-value entries', () => {
    const output = tables.renderKeyValueTable([
      { key: 'Field', value: 'safe\u009d0;owned\u0007middle\u0090payload\u009cend' }
    ], { columns: 12, color: false });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 12, `${visibleWidth(line)}: ${line}`);
    }
    assert.doesNotMatch(output, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
    assert.doesNotMatch(output, /owned|payload/);
    assert.ok(output.replace(/\s/g, '').includes('Fieldsafemiddleend'), output);
  });

  it('removes C1 OSC and DCS sequences from record-table entries', () => {
    const output = tables.renderRecordTable([
      { field: 'safe\u009d0;owned\u0007middle\u0090payload\u009cend' }
    ], { columns: 12, color: false });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 12, `${visibleWidth(line)}: ${line}`);
    }
    assert.doesNotMatch(output, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
    assert.doesNotMatch(output, /owned|payload/);
    assert.ok(output.replace(/[\s─]/g, '').includes('Fieldsafemiddleend'), output);
  });

  it('removes C1 OSC and DCS sequences from compact nested record-table values', () => {
    const output = tables.renderRecordTable([
      { field: { nested: 'safe\u009d0;owned\u0007middle\u0090payload\u009cend' } }
    ], { columns: 12, color: false });
    for (const line of output.split('\n')) {
      assert.ok(visibleWidth(line) <= 12, `${visibleWidth(line)}: ${line}`);
    }
    assert.doesNotMatch(output, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
    assert.doesNotMatch(output, /owned|payload/);
    assert.ok(output.replace(/[\s─]/g, '').includes('{"nested":"safemiddleend"}'), output);
  });
});
