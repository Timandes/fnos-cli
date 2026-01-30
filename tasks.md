# Implementation Tasks - fnOS CLI

## Task Breakdown

### Phase 1: Project Setup (1-2 hours)

#### Task 1.1: Initialize Project
**Effort**: 30 min
**Dependencies**: None
**Acceptance Criteria**:
- package.json configured with all dependencies (commander, winston, fnos@0.2.0)
- .gitignore configured to exclude node_modules, logs, settings
- bin/fnos-cli executable created with proper shebang
- Project directory structure created

#### Task 1.2: Implement Logger Utility
**Effort**: 30 min
**Dependencies**: Task 1.1
**Acceptance Criteria**:
- Winston logger configured
- Console transport with colored output
- File transport to `${HOME}/.fnos/logs/`
- Log level mapping (-v=info, -vv=debug, -vvv=silly)
- Log file naming format: `fnos-cli-YYYY-MM-DD-{random}.log`

#### Task 1.3: Implement Settings Manager
**Effort**: 1 hour
**Dependencies**: Task 1.1
**Acceptance Criteria**:
- Settings class with load/save/clear methods
- Settings stored in `${HOME}/.fnos/settings.json`
- File permissions set to 600
- JSON schema validation (endpoint, username, password, token, longToken, secret)

#### Task 1.4: Create CLI Entry Point
**Effort**: 1 hour
**Dependencies**: Task 1.2, 1.3
**Acceptance Criteria**:
- Commander.js initialized
- Global options registered (--raw, -v, -vv, -vvv)
- Help system configured
- Error handling middleware

### Phase 2: Authentication (2-3 hours)

#### Task 2.1: Implement Client Wrapper
**Effort**: 1.5 hours
**Dependencies**: Task 1.3
**Acceptance Criteria**:
- createClient function that creates authenticated FnosClient
- Support login with credentials
- Support loginViaToken with saved tokens
- Auto-retry on token expiry
- Connection timeout handling (60s)

#### Task 2.2: Implement Login Command
**Effort**: 1 hour
**Dependencies**: Task 2.1
**Acceptance Criteria**:
- `fnos-cli login -e <endpoint> -u <username> -p <password>` command
- Validates credentials by calling FnosClient.login()
- Saves all auth data to settings file
- Displays success message
- Handles login errors gracefully

#### Task 2.3: Implement Logout Command
**Effort**: 30 min
**Dependencies**: Task 1.3
**Acceptance Criteria**:
- `fnos-cli logout` command
- Clears all auth data from settings file
- Displays logout confirmation

### Phase 3: Core Commands (3-4 hours)

#### Task 3.1: Implement Output Formatter
**Effort**: 1 hour
**Dependencies**: Task 1.2
**Acceptance Criteria**:
- formatOutput function with raw mode support
- Table formatting for arrays
- Pretty-printed JSON for objects
- Direct output for primitives
- Colorized output for readability

#### Task 3.2: Implement Resmon Commands
**Effort**: 1.5 hours
**Dependencies**: Task 2.1, 3.1
**Acceptance Criteria**:
- Commands: resmon.cpu, resmon.gpu, resmon.mem, resmon.disk, resmon.net, resmon.gen
- resmon.gen supports --items parameter (comma-separated)
- All commands support --raw flag
- Help text for each command

#### Task 3.3: Implement Store Commands
**Effort**: 1.5 hours
**Dependencies**: Task 2.1, 3.1
**Acceptance Criteria**:
- Commands: store.general, store.calcSpace, store.listDisk, store.diskSmart, store.state
- store.listDisk supports --noHotSpare parameter (default: true)
- store.diskSmart requires --disk parameter
- store.state supports optional --name and --uuid parameters
- All commands support --raw flag

### Phase 4: Extended Commands (3-4 hours)

#### Task 4.1: Implement Sysinfo Commands
**Effort**: 1 hour
**Dependencies**: Task 2.1, 3.1
**Acceptance Criteria**:
- Commands: sysinfo.getHostName, sysinfo.getTrimVersion, sysinfo.getMachineId, sysinfo.getHardwareInfo, sysinfo.getUptime
- All commands support --raw flag
- Help text for each command

#### Task 4.2: Implement User Commands
**Effort**: 1 hour
**Dependencies**: Task 2.1, 3.1
**Acceptance Criteria**:
- Commands: user.info, user.listUG, user.groupUsers, user.isAdmin
- All commands support --raw flag
- Help text for each command

#### Task 4.3: Implement Network Commands
**Effort**: 1 hour
**Dependencies**: Task 2.1, 3.1
**Acceptance Criteria**:
- Commands: network.list, network.detect
- network.list supports --type parameter (0 or 1, default: 0)
- network.detect requires --ifName parameter
- All commands support --raw flag

#### Task 4.4: Implement File Commands
**Effort**: 1 hour
**Dependencies**: Task 2.1, 3.1
**Acceptance Criteria**:
- Commands: file.ls, file.mkdir, file.rm
- file.ls supports optional --path parameter
- file.mkdir requires --path parameter
- file.rm requires --files parameter (comma-separated)
- file.rm supports --moveToTrashbin parameter (default: true)
- All commands support --raw flag

#### Task 4.5: Implement SAC Commands
**Effort**: 30 min
**Dependencies**: Task 2.1, 3.1
**Acceptance Criteria**:
- Command: sac.upsStatus
- Supports --raw flag
- Help text

### Phase 5: Testing (2-3 hours)

#### Task 5.1: Test Authentication Flow
**Effort**: 1 hour
**Dependencies**: Task 2.2, 2.3
**Acceptance Criteria**:
- Login with valid credentials succeeds
- Login with invalid credentials fails
- Logout clears settings
- Re-login with saved credentials works

#### Task 5.2: Test All Commands
**Effort**: 2 hours
**Dependencies**: All previous tasks
**Acceptance Criteria**:
- Test each command with valid parameters
- Test each command with --raw flag
- Test each command with -v, -vv, -vvv flags
- Test error handling for invalid parameters
- Test connection timeout handling

### Phase 6: Polish (1-2 hours)

#### Task 6.1: Improve Error Messages
**Effort**: 30 min
**Dependencies**: Task 5.2
**Acceptance Criteria**:
- Clear, user-friendly error messages
- Helpful suggestions for fixing errors
- Proper exit codes

#### Task 6.2: Optimize Performance
**Effort**: 30 min
**Dependencies**: Task 5.2
**Acceptance Criteria**:
- Commands execute within timeout
- Memory usage is reasonable
- No memory leaks

#### Task 6.3: Final Testing
**Effort**: 1 hour
**Dependencies**: Task 6.1, 6.2
**Acceptance Criteria**:
- All commands tested with real server
- All edge cases tested
- Documentation updated

## Task Dependencies Graph

```
1.1 (Init Project)
  ├─> 1.2 (Logger)
  ├─> 1.3 (Settings)
  └─> 1.4 (CLI Entry)
       ├─> 2.1 (Client Wrapper)
       │    ├─> 2.2 (Login)
       │    ├─> 2.3 (Logout)
       │    ├─> 3.2 (Resmon)
       │    ├─> 3.3 (Store)
       │    ├─> 4.1 (Sysinfo)
       │    ├─> 4.2 (User)
       │    ├─> 4.3 (Network)
       │    ├─> 4.4 (File)
       │    └─> 4.5 (SAC)
       └─> 3.1 (Formatter)
            ├─> 3.2 (Resmon)
            ├─> 3.3 (Store)
            ├─> 4.1 (Sysinfo)
            ├─> 4.2 (User)
            ├─> 4.3 (Network)
            ├─> 4.4 (File)
            └─> 4.5 (SAC)
All Phase 4 Tasks ─> 5.1 (Test Auth)
All Phase 4 Tasks ─> 5.2 (Test Commands)
5.1, 5.2 ─> 6.1 (Error Messages)
5.1, 5.2 ─> 6.2 (Performance)
6.1, 6.2 ─> 6.3 (Final Testing)
```

## Total Estimated Time
- Phase 1: 3 hours
- Phase 2: 3 hours
- Phase 3: 4 hours
- Phase 4: 4.5 hours
- Phase 5: 3 hours
- Phase 6: 2 hours
- **Total: 19.5 hours**

## Parallel Execution Opportunities
- Tasks 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5 can be developed in parallel after Task 3.1 is complete
- Tasks 5.1 and 5.2 can be partially parallelized (test auth while testing commands)

## Critical Path
1.1 → 1.3 → 1.4 → 2.1 → 2.2 → 3.1 → 3.2 → 5.2 → 6.3