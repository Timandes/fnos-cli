# Detailed Command Help Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Complete the approved hierarchical help with bilingual operational details for business and utility operations.

**Architecture:** Pure help metadata builds localized sections from domain context, explicit operation overrides and existing catalog parameter definitions. Commander appends these sections without changing description, parsing or actions; the reference generator consumes the same section model.

**Tech Stack:** Existing Node.js, Commander, i18n, string-width/display-width helpers and Mocha; no new dependency.

**Spec:** docs/superpowers/specs/2026-11-01-cli-help-copy-design.md (second stage).

## Global Constraints

Chinese first, equivalent English; root/group/completion summaries remain compact; all business leaves and utility operations covered; exact existing parser/defaults; no invented fields or automatic effect inference; no network/credential access for help; preserve streams and exit codes.

## Review Focus

Dotted versus grouped parity; shared authentication does not apply to login/local commands; false/null/empty-array defaults; CSV/JSON boundaries; copyable examples and widths. These are pinned by the tests below.

### Task 1: Detailed contracts and CLI rendering

**Files:** Create src/help/content.js, src/help/sections.js, src/help/wrap.js; modify src/i18n/commander.js; create test/unit/detailed-help.test.js.

**Interfaces:** getHelpSections(path: string[]) returns localized [{title, lines, examples?}]; renderHelpDetails(path, columns) renders sections; commandExamples(path) returns token arrays. Root/unknown/group paths return no sections except executable completion.

- [x] Write failing public help tests for listDisk's complete contract, bilingual sections, grouped/dotted equality and help without saved credentials.
- [x] Run the tests and observe missing detailed-section assertions fail.
- [x] Add Chinese-led bilingual metadata, generated parameter contracts and targeted operation overrides for verified ER/effects.
- [x] Append rendered sections in existing localized formatHelp using the command's path; retain existing description and option registrations.
- [x] Verify all 111 operations and utility coverage, defaults/ranges/formats, examples via injected action parsing and display widths. Run affected existing tests.

### Task 2: Shared documentation and final verification

**Files:** Modify scripts/generate-command-reference.js, docs/commands.md and README.md; extend detailed-help.test.js.

**Interfaces:** Consume getHelpSections; render markdown from the same localized lines and example tokens, fixed English context.

- [x] Write a failing reference assertion for detailed sections and option constraints, then run it to verify missing content.
- [x] Integrate section generation into reference and document the expanded leaf help in README; regenerate reference.
- [x] Run full npm test and git diff --check; inspect actual Chinese/English root/group/dotted/utility help.
- [x] Obtain independent final review; resolve material findings, update plan, commit and report evidence. No merge/push or NAS operation.

Implementation note: new detailed copy is kept as adjacent Chinese/English pairs in content.js and selected with the existing getLanguage() context; existing summaries continue through t(). This keeps the operational text reviewable together without a second language selector or preference system.

Verification: initial tests failed on missing sections/reference; final suite 359 passing, 1 pending. All 444 bilingual grouped/dotted business help outputs and 238 localized metadata paths audited; examples parse using replacement actions without NAS execution. Review found one Markdown placeholder issue, reproduced with a failing assertion and fixed with inline code/escaping. Existing log initialization may create a log directory during CLI startup; help tests verify no credential settings/key files are created.
