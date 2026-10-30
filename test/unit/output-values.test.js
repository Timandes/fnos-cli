const assert = require('node:assert/strict');
const { describe } = require('mocha');
const { it } = require('../helpers/english');

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
    assert.equal(values.formatValue('name', ''), '\"\"');
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
    assert.equal(values.compactValue({ nested: true }), '{\"nested\":true}');
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
