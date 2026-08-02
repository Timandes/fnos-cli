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
