const assert = require('node:assert/strict');
const { describe, it } = require('mocha');
const pkg = require('../../package.json');

describe('package metadata', () => {
  it('pins the fnos 0.4 compatible range and exposes test entry points', () => {
    assert.equal(pkg.dependencies.fnos, '^0.4.0');
    assert.equal(pkg.scripts.test, 'npm run test:unit');
    assert.equal(pkg.scripts['test:unit'], 'mocha "test/unit/**/*.test.js"');
    assert.equal(pkg.scripts['test:smoke'], 'mocha --timeout 180000 "test/smoke/**/*.test.js"');
    assert.equal(pkg.scripts['test:all'], 'npm run test:unit && npm run test:smoke');
    assert.equal(pkg.scripts['docs:commands'], 'node scripts/generate-command-reference.js');
  });
});
