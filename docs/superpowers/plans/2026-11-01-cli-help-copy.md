# CLI Help Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Expand every public command summary in Chinese first, then translate it into equivalent English.

**Architecture:** Keep the existing hierarchical help and stable message keys. Update dictionary values so help, completion and generated reference share the expanded copy.

**Tech Stack:** Node.js, existing i18n dictionaries, Commander, Mocha.

**Spec:** docs/superpowers/specs/2026-11-01-cli-help-copy-design.md

## Global Constraints

Chinese first; English equivalent; summaries remain single logical lines; no invented capabilities; command parsing and runtime behavior stay unchanged; no new dependencies.

## Review Focus

Chinese/English meaning; complete catalog coverage; real defaults; local versus remote state; help/completion/reference consistency. Existing tests and one-off coverage/render audits cover these without tests that merely duplicate copy strings.

### Task 1: Expand and verify the shared command descriptions

**Files:** src/i18n/zh-CN.js, src/i18n/en.js, docs/commands.md.

**Interfaces:** Existing description keys remain stable; t(key) supplies expanded localized values to existing consumers.

- [x] Expand Chinese descriptions for all catalog domains, business commands and utility commands.
- [x] Translate the Chinese descriptions into English, preserving accurate scope and qualifiers.
- [x] Regenerate the reference with npm run docs:commands.
- [x] Run coverage/translation audits and inspect bilingual root/group/dotted help.
- [x] Run npm test; resolve regressions and obtain a fresh copy review.
- [x] Commit the reviewed copy and updated design/plan; report actual validation results.

No new string-mirroring tests: this is a reversible copy-only change. User authorization to perform the copy update is already explicit; execute inline without another approval round.

Validation: 143 bilingual descriptions audited; 46 bilingual help invocations passed; generated reference matches renderer; full suite 350 passing, 1 pending. Fresh review found no high-impact issues; four copy improvements applied before final verification.
