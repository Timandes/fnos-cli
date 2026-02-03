# Plugin System Guide

This guide explains how to create, configure, and use plugins for fnos-cli.

## Overview

The fnos-cli plugin system allows developers to extend the CLI with custom commands. Plugins can:

- Register new commands with the `fnos` CLI
- Access fnos SDK for system operations
- Access authentication credentials (readonly)
- Define their own configuration schemas
- Leverage the provided SDK for common tasks

## Creating a Plugin

### Using the Scaffold Tool

The easiest way to create a new plugin is to use the `create-plugin` command:

```bash
fnos create-plugin my-plugin \
  --path /path/to/plugins \
  --version "1.0.0" \
  --description "My awesome plugin" \
  --author "Your Name"
```

This will generate the following structure:

```
my-plugin/
├── package.json
└── index.js
```

### Manual Plugin Structure

A plugin must have:

1. **package.json** - Plugin manifest with `fnos.plugin` field
2. **index.js** - Plugin entry point exporting `init` and `schema`

#### package.json Example

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "main": "index.js",
  "author": "Your Name",
  "license": "MIT",
  "fnos": {
    "plugin": {
      "name": "my-plugin",
      "version": "1.0.0",
      "entry": "index.js"
    },
    "commands": {
      "command-name": {
        "description": "Command description"
      }
    }
  }
}
```

#### index.js Example

```javascript
const sdk = require('fnos-cli/sdk');

// Plugin configuration schema
const schema = {
  type: 'object',
  properties: {
    option1: {
      type: 'string',
      description: 'An option',
      default: 'default-value'
    }
  },
  additionalProperties: false
};

/**
 * Plugin initialization function
 * @param {Object} config - Plugin configuration from settings.json
 * @param {Object} deps - Plugin dependencies
 * @param {Object} deps.logger - Logger instance
 * @param {Object} deps.settings - Settings object
 * @param {Object|null} deps.auth - Authentication credentials (readonly)
 * @param {Function} deps.getSDKInstance - Function to get SDK client instance
 * @returns {Object} Plugin commands
 */
function init(config, deps) {
  const { logger } = deps;

  // Validate configuration
  const validation = sdk.validateConfig(config, schema);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // Return plugin commands
  return {
    commandName: {
      description: 'Command description',
      action: async (options) => {
        // Command logic here
        return { result: 'ok' };
      },
      params: [
        {
          name: 'param1',
          required: true,
          description: 'Parameter description'
        }
      ]
    }
  };
}

module.exports = { init, schema };
```

## Plugin Configuration

### Adding Configuration

To add configuration options to your plugin:

1. Define properties in your `schema` object
2. Access them via the `config` parameter in `init()`

```javascript
const schema = {
  type: 'object',
  properties: {
    apiKey: {
      type: 'string',
      description: 'API key for external service'
    },
    maxRetries: {
      type: 'number',
      description: 'Maximum number of retries',
      default: 3
    }
  },
  additionalProperties: false
};

function init(config, deps) {
  const { logger, auth } = deps;

  const apiKey = config.apiKey;
  const maxRetries = config.maxRetries || 3;

  // Use configuration
  logger.info(`Using maxRetries: ${maxRetries}`);

  return {
    // commands...
  };
}
```

### Configuration in settings.json

Add plugin configuration to `~/.fnos/settings.json`:

```json
{
  "plugins": {
    "my-plugin": {
      "apiKey": "your-api-key",
      "maxRetries": 5
    }
  }
}
```

## Plugin SDK

The plugin SDK provides helper functions and utilities:

### validateConfig(config, schema)

Validate plugin configuration against a JSON Schema.

```javascript
const validation = sdk.validateConfig(config, schema);
if (!validation.valid) {
  throw new Error(validation.errors.join(', '));
}
```

### createLogger(name)

Create a named logger instance.

```javascript
const logger = sdk.createLogger('my-plugin');
logger.info('Message');
logger.error('Error message');
```

### createSchemaValidator(schema)

Create a reusable schema validator.

```javascript
const validator = sdk.createSchemaValidator(schema);
const result = validator(data);
```

### createPluginError(message, code)

Create a plugin error with optional error code.

```javascript
const error = sdk.createPluginError('Something went wrong', 'PLUGIN_ERROR');
throw error;
```

### formatError(error)

Format an error for user-friendly display.

```javascript
const formatted = sdk.formatError(error);
console.error(formatted);
```

## Dependencies

The `init` function receives the following dependencies:

### logger

Winston logger instance. Use levels: `error`, `warn`, `info`, `debug`, `silly`.

```javascript
logger.info('Information message');
logger.error('Error message');
```

### settings

Global settings object from `settings.json`.

```javascript
const settings = deps.settings;
```

### auth

Authentication credentials (readonly proxy). Contains:

```javascript
{
  endpoint: 'https://fnos.example.com',
  username: 'admin',
  password: 'password',
  token: 'auth-token',
  longToken: 'long-lived-token',
  secret: 'secret-key'
}
```

⚠️ **Note**: The `auth` object is readonly. Any attempt to modify it will throw an error.

### getSDKInstance(client, className)

Get an instance of an fnos SDK class.

```javascript
const client = require('fnos');
const resourceMonitor = deps.getSDKInstance(client, 'ResourceMonitor');
const cpuInfo = await resourceMonitor.cpu();
```

## Command Parameters

Define parameters for your commands:

```javascript
{
  commandName: {
    description: 'Command description',
    action: async (options) => {
      const { param1, param2 } = options;
      // Use parameters
    },
    params: [
      {
        name: 'param1',
        required: true,
        description: 'Required parameter'
      },
      {
        name: 'param2',
        required: false,
        description: 'Optional parameter'
      },
      {
        name: 'custom',
        required: false,
        option: '--custom-name <value>',
        description: 'Custom option format'
      }
    ]
  }
}
```

## Installing Plugins

### Official Plugins (plugins/ Directory)

Copy your plugin to the `plugins/` directory in the fnos-cli installation:

```bash
cp -r my-plugin /path/to/fnos-cli/plugins/
```

### User Plugins (settings.json)

Add the plugin path to `settings.json`:

```json
{
  "pluginPaths": [
    "/absolute/path/to/my-plugin"
  ]
}
```

## Using Plugin Commands

Once installed, plugin commands are available under the plugin name:

```bash
# List all commands
fnos --help

# Use a plugin command
fnos plugin-name command-name --param1 value1

# With global options
fnos plugin-name command-name --param1 value1 --verbose --raw
```

## Example: hello-plugin

See the `plugins/hello-plugin/` directory for a complete example:

```bash
# Use the hello plugin
fnos hello-plugin greet --name "World"

# Custom greeting
fnos hello-plugin greet --name "fnOS" --greeting "Welcome"

# With verbose output
fnos hello-plugin greet --name "World" --verbose
```

## Error Handling

Always handle errors in your command actions:

```javascript
action: async (options) => {
  try {
    // Command logic
    return { result: 'success' };
  } catch (error) {
    logger.error(`Command failed: ${error.message}`);
    throw error; // Re-throw for CLI to handle
  }
}
```

## Best Practices

1. **Validate Configuration**: Always validate configuration in `init()`
2. **Use Logger**: Use the provided logger for consistent output
3. **Handle Errors**: Wrap command logic in try-catch blocks
4. **Document Commands**: Provide clear descriptions for commands and parameters
5. **Test Locally**: Test plugins before deployment
6. **Keep Dependencies Minimal**: Only depend on what you need
7. **Respect Readonly Auth**: Don't try to modify the auth object
8. **Use SDK Helpers**: Leverage the provided SDK utilities

## Troubleshooting

### Plugin Not Loading

Check:

1. Plugin manifest is valid (name, version, entry)
2. Plugin path is absolute
3. No command conflicts with existing plugins
4. Plugin configuration is valid (if schema defined)

### Configuration Errors

Check:

1. Configuration matches the schema
2. No typos in configuration keys
3. Types match schema definitions

### Command Not Found

Check:

1. Plugin is loaded (check startup logs)
2. Command name is correct
3. No command conflicts

## Resources

- Plugin SDK: `src/sdk/index.js`
- Example Plugin: `plugins/hello-plugin/`
- Spec: `spec.md`
- Plan: `plan.md`