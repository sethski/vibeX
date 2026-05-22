# Changelog

## 0.8.0

- Add workspace topology detection from `pnpm-workspace.yaml` and `package.json#workspaces`.
- Add monorepo package-root targeting based on `--active-file` context.
- Add per-package cache storage under `.vibex/` while preserving root-cache compatibility.
- Add fixture and unit coverage for workspace roots and package-root context selection.

## 0.7.0

- Add compact diff-stat summarization prioritizing highest-signal changed files.
- Add terminal error fingerprint deduplication to reduce repeated noise.
- Integrate diff/error intelligence directly into context grabbing.
- Add dedicated tests for diff summarization and error dedupe behavior.

## 0.6.0

- Add context confidence scoring in preview/explain output.
- Add low-confidence fallback prompt with clarifying question.
- Add `vibex explain --json` as preview+explain command alias.
- Route optimize behavior through confidence-aware preview logic for consistent fallback policy.

## 0.5.0

- Add fixture-based context tests for Next.js, Vite React, and pnpm monorepo shapes.
- Add `vibex compare --json` with token counts and reduction percentage.
- Add context ranking alignment across preview/compression (`stack`, `file`, `error`, `neighbors`, `diff`).
- Add benchmark script `npm run bench:context` for scan/context latency checks.
- Extend CLI privacy coverage for JSON outputs.

## 0.4.0

- Add context engine upgrades: package manager detection, framework detection, source/test roots, and tsconfig alias parsing.
- Add import-neighbor discovery from active file imports (relative and alias-based).
- Add `vibex scan --json`.
- Add `vibex context --json` with optional `--active-file` and `--cursor-line`.
- Add fixture-style tests for context grabber and memory detection.

## 0.3.0

- Add `vibex preview` with JSON and text output.
- Add include/exclude context controls for stack, file, diff, error, and neighbors.
- Add explanation details for preview context decisions.
- Add `POST /preview` API.
- Add privacy coverage proving preview context details do not echo raw prompt secrets.

## 0.2.1

- Remove public token budget control from TypeScript/API options.
- Make target profiles low-token aliases with no added wrapper text.
- Keep fixed internal token-efficient trimming.

## 0.2.0

- Add target profiles for Codex, Claude, Cursor, and Copilot.
- Add `vibex doctor` checks for Node, package metadata, test script, and project memory.
- Add optional `--copy` clipboard output.
- Add CLI tests for target profiles and doctor JSON output.
- Add npm publish dry-run script.

## 0.1.0

- Add deterministic prompt analyzer, compressor, formatter, context grabber, and project memory.
- Add CLI and localhost API.
- Add OSS docs, tests, CI, and issue templates.
