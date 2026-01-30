# Implementation Plan - fnOS CLI

## System Architecture

### Project Structure
```
fnos-cli-2/
├── src/
│   ├── index.js              # CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── auth.js          # login/logout commands
│   │   ├── resmon.js        # resource monitor commands
│   │   ├── store.js         # storage commands
│   │   ├── sysinfo.js       # system info commands
│   │   ├── user.js          # user commands
│   │   ├── network.js       # network commands
│   │   ├── file.js          # file commands
│   │   └── sac.js           # SAC (UPS) commands
│   ├── utils/
│   │   ├── logger.js        # Winston logger configuration
│   │   ├── settings.js      # Settings file management
│   │   ├── formatter.js     # Output formatting utilities
│   │   └── client.js        # FnosClient wrapper with auth
│   └── constants.js         # Constants (command mappings, etc.)
├── test/
│   ├── commands/            # Command tests
│   └── utils/               # Utility tests
├── bin/
│   └── fnos-cli             # Executable script
├── package.json
├── .gitignore
└── README.md
```

## Component Design

### 1. CLI Entry Point (src/index.js)
- Initialize Commander.js
- Set up global options (--raw, -v, -vv, -vvv)
- Register all commands
- Handle errors

### 2. Authentication Module (src/utils/client.js)
Wrapper around FnosClient that handles:
- Connection management
- Authentication (login/loginViaToken)
- Token refresh
- Settings integration

**Key Functions**:
- `createClient(options)`: Create authenticated client
- `executeCommand(client, command, args)`: Execute a command with auto-retry

### 3. Settings Manager (src/utils/settings.js)
Handle settings file operations:
- Load settings from `${HOME}/.fnos/settings.json`
- Save settings with proper permissions (600)
- Clear settings (logout)

**Settings Schema**:
```json
{
  "endpoint": "nas-9.timandes.net:5666",
  "username": "SystemMonitor",
  "password": "encrypted-or-plain",
  "token": "base64-token",
  "longToken": "base64-long-token",
  "secret": "base64-secret"
}
```

### 4. Logger (src/utils/logger.js)
Winston configuration:
- Console transport (colored output)
- File transport (to `${HOME}/.fnos/logs/`)
- Log level mapping (-v, -vv, -vvv)

### 5. Output Formatter (src/utils/formatter.js)
Format responses based on type:
- Arrays → Table format
- Objects → Pretty-printed JSON
- Primitive values → Direct output
- Raw mode → Original JSON

### 6. Command Modules (src/commands/)
Each command module implements:
- Register commands with Commander.js
- Execute SDK methods
- Handle errors
- Format output

## Command Mapping

```javascript
const COMMAND_MAPPING = {
  resmon: {
    cpu: { method: 'cpu', req: 'appcgi.resmon.cpu' },
    gpu: { method: 'gpu', req: 'appcgi.resmon.gpu' },
    mem: { method: 'memory', req: 'appcgi.resmon.mem' },
    disk: { method: 'disk', req: 'appcgi.resmon.disk' },
    net: { method: 'net', req: 'appcgi.resmon.net' },
    gen: { method: 'general', req: 'appcgi.resmon.gen', params: ['items'] }
  },
  store: {
    general: { method: 'general', req: 'stor.general' },
    calcSpace: { method: 'calculateSpace', req: 'stor.calcSpace' },
    listDisk: { method: 'listDisks', req: 'stor.listDisk', params: ['noHotSpare'] },
    diskSmart: { method: 'getDiskSmart', req: 'stor.diskSmart', params: ['disk'] },
    state: { method: 'getState', req: 'stor.state', params: ['name', 'uuid'] }
  },
  sysinfo: {
    getHostName: { method: 'getHostName', req: 'appcgi.sysinfo.getHostName' },
    getTrimVersion: { method: 'getTrimVersion', req: 'appcgi.sysinfo.getTrimVersion' },
    getMachineId: { method: 'getMachineId', req: 'appcgi.sysinfo.getMachineId' },
    getHardwareInfo: { method: 'getHardwareInfo', req: 'appcgi.sysinfo.getHardwareInfo' },
    getUptime: { method: 'getUptime', req: 'appcgi.sysinfo.getUptime' }
  },
  user: {
    info: { method: 'getInfo', req: 'user.info' },
    listUG: { method: 'listUserGroups', req: 'user.listUG' },
    groupUsers: { method: 'groupUsers', req: 'user.groupUsers' },
    isAdmin: { method: 'isAdmin', req: 'user.isAdmin' }
  },
  network: {
    list: { method: 'list', req: 'appcgi.network.net.list', params: ['type'] },
    detect: { method: 'detect', req: 'appcgi.network.net.detect', params: ['ifName'] }
  },
  file: {
    ls: { method: 'list', req: 'file.ls', params: ['path'] },
    mkdir: { method: 'mkdir', req: 'file.mkdir', params: ['path'] },
    rm: { method: 'remove', req: 'file.rm', params: ['files', 'moveToTrashbin', 'details'] }
  },
  sac: {
    upsStatus: { method: 'upsStatus', req: 'appcgi.sac.ups.v1.status' }
  }
};
```

## Data Models

### Settings Model
```javascript
class Settings {
  constructor() {
    this.path = path.join(os.homedir(), '.fnos', 'settings.json');
  }

  load() { /* ... */ }
  save(data) { /* ... */ }
  clear() { /* ... */ }
  exists() { /* ... */ }
}
```

### Command Execution Context
```javascript
class CommandContext {
  constructor(options) {
    this.options = options; // Global options (raw, verbose, etc.)
    this.logger = logger;
    this.settings = settings;
  }

  async execute(method, args) { /* ... */ }
  formatOutput(data) { /* ... */ }
  handleError(error) { /* ... */ }
}
```

## API Contracts

### Client Creation
```javascript
async function createClient(settings, options) {
  // 1. Create FnosClient
  // 2. Connect to endpoint
  // 3. Login (with token or credentials)
  // 4. Return authenticated client
}
```

### Command Execution
```javascript
async function executeCommand(client, sdkClass, method, args) {
  // 1. Create SDK instance
  // 2. Call method with args
  // 3. Handle errors
  // 4. Return response
}
```

### Output Formatting
```javascript
function formatOutput(data, raw) {
  if (raw) return JSON.stringify(data, null, 2);
  if (Array.isArray(data)) return formatTable(data);
  if (typeof data === 'object') return formatObject(data);
  return String(data);
}
```

## Implementation Strategy

### Phase 1: Foundation
1. Set up project structure
2. Configure package.json
3. Implement logger utility
4. Implement settings manager
5. Create CLI entry point with Commander.js

### Phase 2: Authentication
1. Implement client wrapper
2. Create login command
3. Create logout command
4. Test authentication flow

### Phase 3: Core Commands
1. Implement resmon commands
2. Implement store commands
3. Implement sysinfo commands
4. Test core functionality

### Phase 4: Extended Commands
1. Implement user commands
2. Implement network commands
3. Implement file commands
4. Implement sac commands
5. Test all commands

### Phase 5: Polish
1. Add output formatting
2. Improve error messages
3. Add help documentation
4. Optimize performance
5. Final testing

## Error Handling Strategy

### Error Types
- `ConnectionError`: Network connection failures
- `AuthenticationError`: Login failures
- `CommandError`: Command execution failures
- `ValidationError`: Invalid parameters

### Error Handling Flow
```
User Command → Try Execute → Catch Error → Log Error → Display User Message → Exit
```

### Exit Codes
- 0: Success
- 1: General error
- 2: Connection error
- 3: Authentication error
- 4: Invalid parameters

## Testing Strategy

### Unit Tests
- Test each utility function
- Test command registration
- Test output formatting

### Integration Tests
- Test authentication flow
- Test command execution with real server
- Test error handling

### Test Configuration
```javascript
const TEST_CONFIG = {
  endpoint: 'nas-9.timandes.net:5666',
  username: 'SystemMonitor',
  password: '123456a'
};
```

## Security Considerations

1. **Password Storage**: Consider encrypting password in settings file
2. **Token Management**: Implement token refresh logic
3. **Input Validation**: Validate all user inputs
4. **Logging**: Never log sensitive data
5. **File Permissions**: Ensure settings file has 600 permissions

## Performance Optimizations

1. **Connection Pooling**: Consider reusing connections (if SDK supports)
2. **Caching**: Cache system info that doesn't change often
3. **Lazy Loading**: Load command modules on demand
4. **Parallel Execution**: Support running multiple commands in parallel

## Future Enhancements

1. **Auto-completion**: Add bash/zsh completion support
2. **Config File**: Support global config file
3. **Aliases**: Allow custom command aliases
4. **Profiles**: Support multiple connection profiles
5. **Interactive Mode**: Add interactive REPL mode