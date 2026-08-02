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
