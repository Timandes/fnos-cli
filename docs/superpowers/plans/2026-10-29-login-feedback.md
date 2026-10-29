# Login Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make password login success visible and authentication rejection actionable, with one error on stderr.

**Architecture:** Keep the existing Commander command and formatter. Build a whitelist success summary after credential persistence. Normalize SDK authentication failures from their response, preserving errno and server messages. Filter the SDK's duplicate authentication error logs at its CLI stderr transport; leave other diagnostics visible.

**Tech Stack:** JavaScript, Commander, fnos 0.5, Winston, Mocha.

**Spec:** User request in this chat: optimize the diagnosed password-login success silence and unknown/duplicate failure messages, in a project-local worktree.

## Global Constraints

- Preserve usernames exactly, including case; do not infer undocumented errno meanings.
- Keep authentication exit code 3 and connection/protocol error behavior.
- Do not output passwords, tokens, secrets or two-factor codes.
- Worktree: `.worktrees/login-feedback`; branch: `hotfix/login-feedback`.
- Use English Conventional Commits with no Co-Authored-By.

## Review Focus

- Raw success must be parseable JSON with no credentials.
- Failed persistence must not print success.
- Empty, unknown and errno-only rejection responses need useful fallback text.
- Two-factor rejection must retain its errno and give stage-specific guidance.
- SDK log deduplication must preserve unrelated errors and repeated logger setup.

### Task 1: Password login feedback

**Files:** `src/commands/auth.js`, `src/utils/client.js`, `src/utils/logger.js`, corresponding unit tests, `README.md`.

**Interfaces:** Existing `registerLoginCommand`, `createClientWithCredentials` and `setLogLevel` signatures remain unchanged. Success summary contains result, server, authType, endpoint, username and credentialsSaved. Error formatting consumes SDK msg/errmsg/errno.

- [x] Add regression tests for success summaries, raw output, failed save, errno-only/empty/unknown login failures and two-factor rejection, using the real SDK message handler for the failure integration case.
- [x] Run the targeted tests and confirm expected failures before implementation.
- [x] Output a safe success summary only after createClient completes; normalize authentication failures and filter duplicate SDK authentication logs without hiding unrelated errors.
- [x] Run targeted tests and the full `npm test`; inspect output and `git diff --check`.
- [x] Update README to explain login feedback and username case handling.
- [x] Review the resulting diff and retain the worktree for user review; do not merge or publish.

## Verification

- Clean baseline: `npm test` → 263 passing.
- Regression tests before implementation: 1 passing, 11 failing (missing success output, discarded errno, unknown-message fallback and duplicated SDK logs).
- Initial targeted authentication/logger tests: 47 passing; initial full suite: 275 passing.
- Review found endpoint userinfo could leak a proxy password in the new success summary. Added two regression tests, confirmed both fail, then omitted userinfo only in displayed output. Saved endpoint remains unchanged. Final targeted authentication/logger tests: 49 passing.
- Review also narrowed README's single-error promise to password/two-factor rejections, since unrelated SDK diagnostics remain visible.
- Final full suite: `npm test` → 277 passing; `git diff --check` → clean.
- No real NAS credentials or login requests used; the integration tests replace only the SDK network/encryption boundaries.
- Scope retained after review: existing connection/persistence failure logging remains unchanged; credentials-save failures still never print success.
