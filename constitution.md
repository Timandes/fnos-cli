# Constitution - fnOS CLI

## Project Principles

### 1. Technology Stack
- **Language**: JavaScript (ES2022+)
- **SDK**: fnos@0.2.0
- **CLI Framework**: Commander.js
- **Logging**: Winston
- **Testing**: Mocha + Chai (or similar)

### 2. Coding Standards
- Use async/await for all asynchronous operations
- Follow JavaScript Standard Style (or ESLint with standard config)
- Use 4 spaces for indentation
- Use single quotes for strings
- Use const/let, never var
- Add JSDoc comments for all public functions

### 3. Security Rules
- Never log sensitive data (passwords, tokens, secrets)
- Store credentials in `${HOME}/.fnos/settings.json` with proper file permissions (600)
- Use environment variables for sensitive configuration when possible
- Validate all user inputs before processing

### 4. Performance Requirements
- Connection timeout: 60 seconds maximum
- Command timeout: 30 seconds default, configurable
- Support concurrent command execution (each command creates new connection)
- Memory usage: Keep under 100MB for typical usage

### 5. Error Handling
- All errors must be caught and handled gracefully
- Provide user-friendly error messages
- Log detailed error information to log file
- Exit with appropriate error codes (0 for success, non-zero for errors)

### 6. User Experience
- Clear help messages for all commands
- Consistent command structure (command.subcommand)
- Support both raw JSON and formatted output
- Verbose logging options (-v, -vv, -vvv)
- Auto-save login credentials for convenience

### 7. Architecture Principles
- Modular design: Separate concerns (commands, auth, logging, output formatting)
- Dependency injection: Pass dependencies (client, logger) to command functions
- Single responsibility: Each function/module does one thing well
- Testability: All functions should be unit-testable

### 8. Version Control
- Use semantic versioning
- Commit messages should be clear and descriptive
- Tag releases on GitHub