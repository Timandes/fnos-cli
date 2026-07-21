const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('mocha');

describe('CI workflow', () => {
  it('pins and runs the requested mock-server smoke backend', () => {
    const workflowPath = path.resolve(__dirname, '../../.github/workflows/tests.yml');
    const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, 'utf8') : '';
    assert.match(workflow, /"release\/\*\*"/);
    assert.match(workflow, /node-version: \["18", "20"\]/);
    assert.match(workflow, /node-version: \$\{\{ matrix\.node-version \}\}/);
    assert.match(workflow, /d9592a05a8e07082b954921acfae3a9a915f3c01/);
    assert.match(workflow, /python-version: "3\.11"/);
    assert.match(workflow, /FNOS_MOCK_TWOFA_USERS: twofauser/);
    assert.match(workflow, /npm run test:all/);
    assert.match(workflow, /if: always\(\)/);
  });
});
