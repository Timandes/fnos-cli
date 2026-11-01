# Password Input and Encryption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add stdin and hidden interactive passwords, encrypt stored passwords and migrate old settings.
**Architecture:** A password-input utility resolves the source before connection. A password-store utility owns AES-GCM and local key management; settings remain responsible for validation, migrations and locking. A private-path utility applies Unix permissions or Windows ACLs.
**Tech Stack:** CommonJS, Node >=18.17 built-ins, Commander, Mocha.
**Spec:** docs/superpowers/specs/2026-10-31-password-input-encryption-design.md

## Global Constraints
- Support macOS, Linux and Windows; do not introduce native npm dependencies.
- Use AES-256-GCM, 32-byte key, 12-byte nonce and 16-byte tag.
- Keep existing WS credentialVersion/secretFormat and OAuth semantics.
- Keep secrets out of logs and subprocess command arguments.
- Work only in `.worktrees/password-input-encryption` on `feature/password-input-encryption`.

## Review Focus
- Missing keys must not break listing/logout or overwrite unrelated encrypted records.
- Concurrent password saves must use one key and preserve both servers.
- StdIn errors/EOF and prompt Ctrl-C must not hang or echo secrets.
- Existing plaintext must be encrypted even when saving a language preference.
- Windows ACL failure must leave the previous settings intact and no exposed key/temp file.

### Task 1: Encrypted settings and private paths
**Files:** Create `src/utils/private-path.js`, `src/utils/password-store.js`, `test/unit/password-storage.test.js`; modify `src/utils/settings.js`, `src/utils/client.js` and affected settings fixtures.
**Interfaces:** `protectPath(path, directory, dependencies?)`; `PasswordStore(settingsDir).encrypt(password, context)` and `.decrypt(envelope, context)`; settings consumers still receive string passwords.
- [x] Write behavioral tests for disk ciphertext, roundtrip, plaintext/legacy migration, nonce freshness, metadata and OAuth, missing/corrupt key, tamper/swap, settings rollback, concurrent saves, Unix permissions and Windows ACL subprocess failure.
- [x] Run the new tests and observe feature failures.
- [x] Implement private paths, AES-GCM/key lifecycle, encrypted record validation and locked migration; adjust old tests to stage raw legacy fixtures and expect encrypted storage.
- [x] Run storage/settings/OAuth tests and compare against expected all-pass output.

### Task 2: Password input and command integration
**Files:** Create `src/utils/password-input.js`, `test/unit/password-input.test.js`; modify `src/commands/options.js`, `src/commands/auth.js`, `src/utils/auth-helper.js`, `src/commands/runner.js`, dictionaries and CLI tests.
**Interfaces:** `resolvePassword(options, {input, output} = {}) -> Promise<string>`; existing resolveCredentials returns the same credential structure.
- [x] Write tests for stdin, CRLF, spaces, empty/multiple lines, mutual exclusion, TTY input/editing/cancellation, missing TTY, OAuth conflict, temporary credentials and saved server reuse.
- [x] Run new tests and observe feature failures.
- [x] Implement input resolution, raw-mode cleanup and early parameter validation, then wire into login and business credentials.
- [x] Run all tests; exercise hidden input through a PTY and inspect help/completion.

### Task 3: Documentation and final verification
**Files:** Modify `README.md`, `docs/commands.md`, `scripts/generate-command-reference.js`, `CHANGELOG.md` and Windows CI.
- [x] Document commands, migration, permissions, backup/key loss and downgrade limitations.
- [x] Regenerate command reference; run `npm test` with loopback permission as needed; expect all tests pass.
- [x] Review final diff for secrets, compatibility, rollback and Windows behavior, then address material findings with regression tests.
