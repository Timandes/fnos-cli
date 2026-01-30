# Specification - fnOS CLI

## Project Overview
Create a CLI client for飞牛 fnOS system that allows users to interact with fnOS services via WebSocket using the fnos SDK.

## User Stories

### US1: User Authentication
As a CLI user, I want to login to fnOS system so that I can execute commands without re-entering credentials.

**Acceptance Criteria**:
- User can login using `fnos-cli login -e <endpoint> -u <username> -p <password>`
- Credentials are saved to `${HOME}/.fnos/settings.json`
- Settings file includes: endpoint, username, password, token, longToken, secret
- Settings file has permissions 600
- User can logout using `fnos-cli logout` which clears credentials

### US2: Resource Monitoring
As a system administrator, I want to monitor system resources (CPU, GPU, memory, disk, network) so that I can assess system performance.

**Acceptance Criteria**:
- Commands: `fnos-cli resmon.cpu`, `fnos-cli resmon.gpu`, `fnos-cli resmon.mem`, `fnos-cli resmon.disk`, `fnos-cli resmon.net`
- Command `fnos-cli resmon.gen` supports optional `--items` parameter
- Output can be raw JSON (`--raw`) or formatted

### US3: Storage Management
As a system administrator, I want to view storage information so that I can manage disk usage.

**Acceptance Criteria**:
- Commands: `fnos-cli store.general`, `fnos-cli store.calcSpace`, `fnos-cli store.listDisk`
- Command `fnos-cli store.diskSmart` requires `--disk` parameter
- Command `fnos-cli store.state` accepts optional `--name` and `--uuid` parameters
- Command `fnos-cli store.listDisk` supports `--noHotSpare` parameter (default: true)

### US4: System Information
As a system administrator, I want to retrieve system information so that I can understand the system configuration.

**Acceptance Criteria**:
- Commands: `fnos-cli sysinfo.getHostName`, `fnos-cli sysinfo.getTrimVersion`, `fnos-cli sysinfo.getMachineId`, `fnos-cli sysinfo.getHardwareInfo`, `fnos-cli sysinfo.getUptime`

### US5: User Management
As a system administrator, I want to manage users so that I can control access to the system.

**Acceptance Criteria**:
- Commands: `fnos-cli user.info`, `fnos-cli user.listUG`, `fnos-cli user.groupUsers`, `fnos-cli user.isAdmin`

### US6: Network Management
As a system administrator, I want to view network information so that I can troubleshoot network issues.

**Acceptance Criteria**:
- Commands: `fnos-cli network.list`, `fnos-cli network.detect`
- Command `fnos-cli network.list` supports `--type` parameter (0 or 1, default: 0)
- Command `fnos-cli network.detect` requires `--ifName` parameter

### US7: File Operations
As a system administrator, I want to perform file operations so that I can manage files remotely.

**Acceptance Criteria**:
- Commands: `fnos-cli file.ls`, `fnos-cli file.mkdir`, `fnos-cli file.rm`
- Command `fnos-cli file.ls` accepts optional `--path` parameter
- Command `fnos-cli file.mkdir` requires `--path` parameter
- Command `fnos-cli file.rm` requires `--files` parameter (comma-separated list)
- Command `fnos-cli file.rm` supports `--moveToTrashbin` parameter (default: true)

### US8: UPS Status
As a system administrator, I want to check UPS status so that I can monitor power backup.

**Acceptance Criteria**:
- Command: `fnos-cli sac.upsStatus`

### US9: Global Options
As a CLI user, I want to control output format and logging level so that I can customize my experience.

**Acceptance Criteria**:
- `--raw` option outputs raw JSON response for all commands
- `-v` option sets log level to 'info'
- `-vv` option sets log level to 'debug'
- `-vvv` option sets log level to 'silly'
- Log files are saved to `${HOME}/.fnos/logs/fnos-cli-YYYY-MM-DD-{randomNumber}.log`

### US10: Help System
As a CLI user, I want to access help information so that I can learn how to use the CLI.

**Acceptance Criteria**:
- `fnos-cli --help` shows all top-level commands and global options
- `fnos-cli <command> --help` shows all sub-commands and command-specific options
- `fnos-cli <command>.<subcommand> --help` shows detailed help for the sub-command

## Functional Requirements (EARS Syntax)

### Authentication
- WHEN the user executes `fnos-cli login -e <endpoint> -u <username> -p <password>`, THEN THE SYSTEM SHALL connect to the endpoint, authenticate with the credentials, and save all authentication data to `${HOME}/.fnos/settings.json`.
- WHEN the user executes `fnos-cli logout`, THEN THE SYSTEM SHALL clear all authentication data from `${HOME}/.fnos/settings.json`.
- WHEN any command is executed, THEN THE SYSTEM SHALL attempt to use saved credentials if available.
- WHEN saved credentials are invalid or missing, THEN THE SYSTEM SHALL prompt for or require command-line parameters.

### Command Execution
- WHEN the user executes a command without saved credentials and without `-e -u -p` parameters, THEN THE SYSTEM SHALL display an error message and exit with code 1.
- WHEN the user executes a command, THEN THE SYSTEM SHALL create a new FnosClient connection, login, execute the command, and close the connection.
- WHEN a command fails, THEN THE SYSTEM SHALL display an error message and exit with a non-zero code.

### Output Formatting
- WHEN `--raw` is specified, THEN THE SYSTEM SHALL output the raw JSON response without formatting.
- WHEN `--raw` is NOT specified, THEN THE SYSTEM SHALL format the output based on the response data type (table for arrays, pretty-printed JSON for objects).

### Logging
- WHEN the CLI starts, THEN THE SYSTEM SHALL create a log file in `${HOME}/.fnos/logs/fnos-cli-YYYY-MM-DD-{randomNumber}.log`.
- WHEN `-v` is specified, THEN THE SYSTEM SHALL log at 'info' level.
- WHEN `-vv` is specified, THEN THE SYSTEM SHALL log at 'debug' level.
- WHEN `-vvv` is specified, THEN THE SYSTEM SHALL log at 'silly' level.

## Non-Functional Requirements

### Performance
- Command execution time should not exceed 60 seconds (excluding network latency).
- Memory usage should not exceed 100MB during normal operation.
- Support at least 10 concurrent command executions.

### Reliability
- Handle network errors gracefully with retry logic (max 3 retries).
- Handle authentication failures with clear error messages.
- Log all errors to the log file.

### Security
- Never log passwords, tokens, or secrets.
- Ensure settings file permissions are 600.
- Validate all user inputs.

### Usability
- Provide clear, concise error messages.
- Auto-complete suggestions for commands and parameters (if possible).
- Consistent command naming and structure.

## Edge Cases

### EC1: Connection Timeout
When the connection to the fnOS server times out, display an error message and exit with code 2.

### EC2: Authentication Failure
When authentication fails (invalid credentials), display an error message and exit with code 3.

### EC3: Invalid Parameters
When invalid parameters are provided, display a helpful error message showing the correct usage.

### EC4: Missing Settings File
When the settings file does not exist and credentials are not provided, prompt the user to login first.

### EC5: Expired Token
When the saved token is expired, automatically re-login using saved credentials.

### EC6: Network Interruption
When the network is interrupted during command execution, log the error and exit gracefully.

### EC7: Empty Response
When the server returns an empty or null response, display "No data returned" message.

### EC8: Large Response
When the response is very large (e.g., file list with many files), truncate the output for display but allow `--raw` to show full data.