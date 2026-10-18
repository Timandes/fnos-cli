# OAuth Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add opt-in OAuth login with fnos 0.5.0 while preserving default password login and legacy settings.

**Architecture:** Settings validate a password/OAuth union. A CLI-owned authorization flow persists sessions; an execution-session factory chooses WS or HTTP and owns cleanup and cross-process locking. Existing command catalog and output code remain shared.

**Tech Stack:** CommonJS JavaScript, Commander 11, fnos ^0.5.0, Mocha, Node >=18.

**Spec:** `docs/superpowers/specs/2026-10-18-oauth-login-design.md`

## Global Constraints

- 密码登录保持默认，SDK 升级到 fnos ^0.5.0。
- Node >=18; no real NAS operations; no Co-Authored-By commit trailers.
- Worktree stays under the project; branch feature/oauth-login.
- Legacy credentials without authType remain readable; credentialVersion is unchanged.

## Review Focus

- Mixed password/OAuth settings must not invalidate unrelated servers (Task 1).
- Concurrent refreshes must reload the newest session; logout must not resurrect tokens (Tasks 1 and 3).
- Failed, cancelled, expired or noninteractive authorization must preserve existing settings (Task 2).
- HTTP 401, 403, business failures and storage failures must have distinct actionable behavior without secret leakage (Tasks 2–4).
- Node 18 Web Crypto and terminal EOF/SIGINT must not break or hang OAuth login (Tasks 2 and 5).

### Task 1: Settings union and locking

**Files:** Modify src/utils/settings.js; create src/utils/file-lock.js; test test/unit/oauth-settings.test.js and test/unit/file-lock.test.js.
**Interfaces:** Settings saveCredentials(name,record), updateOAuthSession(name,identity,session), withServerLock(name,action); acquireFileLock(path) -> async release function.
- [x] Write tests: mixed configurations round-trip without passwords in OAuth records; unknown authType rejected; legacy migration unchanged; session update preserves other servers; duplicate locks wait and release on failure/dead process.
- [x] Run focused tests; expect failures for OAuth validation and missing locking APIs.
- [x] Implement typed records, synchronous short settings update lock, async server locks, guarded session writes.
- [x] Run focused tests and npm test; expect zero failures, then commit feat(auth): support OAuth credential records.

### Task 2: OAuth authorization and login options

**Files:** Create src/utils/oauth.js and src/utils/auth-errors.js; modify src/commands/auth.js and src/commands/options.js; test test/unit/oauth-login.test.js.
**Interfaces:** loginOAuth(options,dependencies) -> safe login summary; terminalAuthorizationCode(pending,{input,output}) -> code; shared AuthenticationError exitCode 3.
- [x] Write tests: real SDK authorization exchange and user.info validation with controlled fetch; failed validation and cancellation preserve old credentials; endpoint/conflicting flags rejected before I/O; TTY required; timeout/EOF/SIGINT cleanup.
- [x] Run tests; expect absent OAuth flow/option failures.
- [x] Implement PKCE flow, bounded/redacted fetch, prompt, success-only save and mode-aware login validation; upgrade SDK to ^0.5.0.
- [x] Run focused and complete unit suite; expect zero failures; commit feat(auth): add explicit OAuth login.

### Task 3: OAuth business sessions

**Files:** Create src/utils/session.js; modify src/utils/client.js, src/utils/auth-helper.js and src/commands/runner.js; test test/unit/oauth-session.test.js.
**Interfaces:** createSession(options,dependencies) -> {client,dispose}; OAuth factory uses real FnosOAuthClient and saveSession guarded by server identity.
- [x] Test saved OAuth runs without password/close; early expiry and 401 persist refreshed sessions before retry; rejected refresh returns 3; storage failure returns 1; two processes serialize and reload; no implicit auth fallback; cleanup always releases locks.
- [x] Run focused tests, expect missing session factory and credential validation failures.
- [x] Implement session factory and runner integration; preserve injected legacy createClient support.
- [x] Run focused and complete suite; expect zero failures; commit feat(auth): execute commands with persisted OAuth sessions.

### Task 4: Status, logout, errors and integration

**Files:** Modify src/commands/auth.js, src/index.js, src/utils/server-selector.js, src/utils/logger.js, src/commands/runner.js; test OAuth CLI integration in test/unit/oauth-cli.test.js.
**Interfaces:** auth.status outputs safe local metadata; logout shares server lock; explicit business failure returns 1 while preserving raw result.
- [x] Test status selects OAuth without password and never emits tokens; real CLI child executes OAuth against local HTTP fixture; logout clears only selected record; auth option completion; 403/401/failed result and all sensitive fields.
- [x] Run focused tests, expect missing status and error handling.
- [x] Implement status/cleanup/result handling and completion metadata; run full suite; commit feat(auth): expose OAuth status and error handling.

### Task 5: Documentation and final validation

**Files:** README.md, CHANGELOG.md, constitution.md, docs/commands.md and existing version expectations.
- [x] Document login, config compatibility, HTTP/TLS, refresh behavior and limits; regenerate command reference.
- [x] Run npm test, WS smoke tests with pinned mock if available, npm pack --dry-run, git diff --check and Node 18 OAuth checks. Record actual outputs.
- [x] Request one fresh whole-change review, address important findings with regression tests, then rerun validation.
- [x] Commit the reviewed fixes and OAuth documentation/validation record. Keep branch/worktree available; do not merge or publish without instruction.
