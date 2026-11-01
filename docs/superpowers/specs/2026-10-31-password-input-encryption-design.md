# Password input and encrypted storage

## Intent and scope
Support safer password entry and remove plaintext passwords from settings written by the CLI, on Node >=18.17 across macOS, Linux and Windows. OAuth tokens and WebSocket token/secret fields retain their existing format; this change encrypts passwords only.

## Decisions
The user selected a cross-platform random local key file over platform credential stores. Use AES-256-GCM with a fresh 12-byte nonce, a 16-byte authentication tag and a 32-byte key in `~/.fnos/password.key`. Store a versioned object in the password field. Bind ciphertext to server name, endpoint and username using authenticated associated data. macOS/Linux permissions are 0700 on the directory and 0600 on files; Windows uses a protected ACL granting the current user's SID full control. Permission setup failures abort storage. Do not put secrets in subprocess arguments.

Keep `--password`; add mutually exclusive `--password-stdin`. Read stdin through EOF, remove at most one trailing LF/CRLF, preserve spaces and reject empty or multi-line input. Require a pipe for stdin mode. With neither option, prompt without echo when a TTY and explicit endpoint/username are available. Noninteractive calls fail promptly with guidance. Handle Enter, backspace, Ctrl-C and EOF, and restore terminal mode/listeners. Apply this to login and temporary business credentials; saved-server commands continue reusing credentials without prompting. Reject password input flags with OAuth and saved server selection before reading stdin.

Keep support for legacy top-level credentials, named plaintext records and OAuth records. Normal credential access migrates old plaintext passwords under the existing settings lock. Settings writes encrypt any plaintext passwords, except selective logout deletions, which preserve other records as stored and work without a key. Server listing and auth.status are metadata-only and do not migrate or decrypt. Metadata-only completion remains read-only. Keep credentialVersion and secretFormat unchanged: those describe WS token compatibility, not password encryption. `getCredentials` returns plaintext only in memory. Missing/damaged keys or ciphertext fail with a redacted, actionable login message; never silently overwrite a bad key or modify ciphertext on failed reads. Missing keys may be recreated on explicit login; a corrupt key requires removing that key before login. Other saved records and unrelated preferences survive relogin and logout. New ciphertext is not readable by older CLI releases; moving machines may require login again.

## Alternatives
1. Local key file (chosen): portable, dependency-free Node crypto, permits unattended commands; copied settings plus key permit decryption.
2. Native keychain/DPAPI: better OS integration but platform-specific dependencies, different migration behavior and possible unlock prompts.

## Verification
Unit and CLI integration tests cover migration, tamper detection, key loss, permissions, rollback, concurrent saves, input validation and cancellation. Exercise the real hidden prompt with a PTY. Test Windows ACL behavior on Windows where available; injected subprocess tests on macOS cannot prove Windows ACL enforcement. Preserve the 322-test baseline and regenerate command documentation.
