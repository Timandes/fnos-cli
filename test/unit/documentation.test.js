const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('mocha');
const pkg = require('../../package.json');
const lock = require('../../package-lock.json');

function loadRenderer() {
  try {
    return require('../../scripts/generate-command-reference');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('../../scripts/generate-command-reference')) return {};
    throw error;
  }
}

const { renderCommandReference } = loadRenderer();

describe('release documentation', () => {
  it('keeps package versions synchronized at 0.4.0', () => {
    assert.equal(pkg.version, '0.4.0');
    assert.equal(lock.version, '0.4.0');
    assert.equal(lock.packages[''].version, '0.4.0');
  });

  it('keeps the generated command reference synchronized', () => {
    assert.equal(typeof renderCommandReference, 'function', 'command reference renderer must be implemented');
    const actual = fs.readFileSync(path.resolve(__dirname, '../../docs/commands.md'), 'utf8');
    assert.equal(actual, renderCommandReference());
    assert.doesNotMatch(actual, /\n\n$/, 'command reference must end with exactly one newline');
    assert.match(actual, /111 commands across 21 domains/);
    assert.match(actual, /-s, --server <name>/);
    assert.match(actual, /Saved server name/);
    assert.match(actual, /`docker\.listContainers`/);
    assert.match(actual, /`security\.getProcessTraffic`/);
  });

  it('documents authentication, smoke testing, and the SDK version', () => {
    const readme = fs.readFileSync(path.resolve(__dirname, '../../README.md'), 'utf8');
    const changelog = fs.readFileSync(path.resolve(__dirname, '../../CHANGELOG.md'), 'utf8');
    const constitution = fs.readFileSync(path.resolve(__dirname, '../../constitution.md'), 'utf8');
    assert.match(readme, /--twofa-code/);
    assert.match(readme, /wss:\/\//);
    assert.match(readme, /npm run test:smoke/);
    assert.match(readme, /fnos.*0\.5\.0/i);
    assert.match(readme, /Node\.js 18\.17 或更高版本/);
    assert.match(readme, /fnos completion install zsh/);
    assert.match(readme, /eval "\$\(fnos completion zsh\)"/);
    assert.match(readme, /~\/\.fnos\/completions/);
    assert.match(readme, /npm update -g fnos-cli/);
    assert.doesNotMatch(readme, /凭证加密保存/);
    assert.match(changelog, /## \[0\.4\.0\] - 2026-08-04/);
    assert.match(changelog, /zsh.*Tab.*补全/i);
    assert.doesNotMatch(changelog, /凭证加密保存/);
    assert.match(constitution, /fnos@0\.5\.0/);
  });
});
