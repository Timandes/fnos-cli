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

  it('publishes only runtime files and user-facing documentation', () => {
    assert.deepEqual(pkg.files, [
      'bin/',
      'src/',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
      'docs/commands.md'
    ]);
  });

  it('exposes complete npm release metadata', () => {
    assert.equal(pkg.author, 'Timandes White');
    assert.deepEqual(pkg.engines, { node: '>=18' });
    assert.deepEqual(pkg.repository, {
      type: 'git',
      url: 'git+https://github.com/Timandes/fnos-cli.git'
    });
    assert.deepEqual(pkg.bugs, {
      url: 'https://github.com/Timandes/fnos-cli/issues'
    });
    assert.equal(pkg.homepage, 'https://github.com/Timandes/fnos-cli#readme');
    assert.deepEqual(pkg.publishConfig, {
      registry: 'https://registry.npmjs.org/'
    });
  });
});
