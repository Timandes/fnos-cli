const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

const PluginScaffold = require('../../src/plugins/scaffold');

describe('PluginScaffold', () => {
  let scaffold;
  let tempDir;

  beforeEach(() => {
    scaffold = new PluginScaffold();
    tempDir = path.join(__dirname, '..', 'temp', 'scaffold-test-' + Date.now());
    if (fs.existsSync(tempDir)) {
      rimraf.sync(tempDir);
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      rimraf.sync(tempDir);
    }
  });

  describe('generate', () => {
    it('generates a complete plugin structure', () => {
      const pluginPath = path.join(tempDir, 'test-plugin');
      
      scaffold.generate(pluginPath, {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author'
      });

      // Verify directory structure
      expect(fs.existsSync(pluginPath)).to.be.true;
      expect(fs.existsSync(path.join(pluginPath, 'package.json'))).to.be.true;
      expect(fs.existsSync(path.join(pluginPath, 'index.js'))).to.be.true;
    });

    it('generates valid package.json', () => {
      const pluginPath = path.join(tempDir, 'test-plugin');
      
      scaffold.generate(pluginPath, {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author'
      });

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(pluginPath, 'package.json'), 'utf8')
      );

      expect(packageJson.name).to.equal('test-plugin');
      expect(packageJson.version).to.equal('1.0.0');
      expect(packageJson.fnos).to.exist;
      expect(packageJson.fnos.plugin.name).to.equal('test-plugin');
    });

    it('generates valid index.js', () => {
      const pluginPath = path.join(tempDir, 'test-plugin');
      
      scaffold.generate(pluginPath, {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author'
      });

      const indexJs = fs.readFileSync(
        path.join(pluginPath, 'index.js'), 'utf8'
      );

      expect(indexJs).to.include("const sdk = require('fnos-cli/sdk')");
      expect(indexJs).to.include("module.exports = { init, schema }");
    });
  });

  describe('getPackageJsonTemplate', () => {
    it('returns valid package.json template', () => {
      const options = {
        name: 'my-plugin',
        version: '2.0.0',
        description: 'My description',
        author: 'My Author'
      };

      const template = scaffold.getPackageJsonTemplate(options);
      const parsed = JSON.parse(template);

      expect(parsed.name).to.equal('my-plugin');
      expect(parsed.version).to.equal('2.0.0');
      expect(parsed.description).to.equal('My description');
      expect(parsed.author).to.equal('My Author');
    });
  });

  describe('getIndexJsTemplate', () => {
    it('returns valid index.js template', () => {
      const options = {
        name: 'my-plugin',
        description: 'My description'
      };

      const template = scaffold.getIndexJsTemplate(options);

      expect(template).to.include("my-plugin");
      expect(template).to.include("My description");
    });
  });
});