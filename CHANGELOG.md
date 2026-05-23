# Changelog

## 1.10.0

- Start SPEC2 hybrid implementation on top of v1.9:
  - add Python core modules (`core/compressor.py`, `core/sanitizer.py`, `core/state_anchor.py`, `core/cache.py`, `core/router.py`, `core/validator.py`)
  - add Python adapter wrapper (`plugins/claude.py`)
  - add `pyproject.toml`
- Add root config surface:
  - `config/defaults.json`
  - `config/rules.json`
  - `config/models.json`
- Extend bridge API:
  - `POST /optimize` supports both legacy (`prompt/context`) and SPEC2 (`raw_prompt/ide_context`) payloads
  - add `POST /sanitize`
  - add `POST /validate`
  - add optional local auth-token mode via `VIBEX_AUTH_TOKEN`
- Add STP and state-anchor flow to optimize responses:
  - `stp_prompt`
  - `state_anchor`
  - `model_flag`
  - `confidence`
- Add local sanitize/validate retry loop with best-effort fallback warning (`⚠️ constraint-violation`).
- Add CLI SPEC2 commands:
  - `vibex stp`
  - `vibex sanitize`
  - `vibex validate`
  - `/vibe` alias support
- Add adapter-contract-first plugin templates:
  - `src/plugins/cursor.ts`
  - `src/plugins/copilot.ts`
- Add test coverage for dual optimize payloads, auth-token mode, sanitize/validate endpoints, STP/state-anchor/model router, and intent cache.

## 1.9.0

- Add deterministic optimization quality scoring with component scores:
  - token efficiency
  - context coverage
  - specificity
  - metadata privacy
- Add CLI quality report command:
  - `vibex score`
- Add HTTP quality report endpoint:
  - `POST /score`
- Add optimization snapshot regression gate:
  - `benchmarks/optimization-snapshots.json`
  - `npm run quality:gate`
- Extend release hardening pipeline to include optimization drift/privacy gate checks.

## 1.8.0

- Add team governance config in `.vibex/team.json` with:
  - org-level defaults
  - named presets
- Add deterministic merge precedence:
  - base defaults
  - team defaults
  - team preset
  - repo overrides
  - explicit CLI/API options
- Add inheritance control via repo config (`inheritTeam`) and optional repo-selected preset (`teamPreset`).
- Add CLI team commands:
  - `vibex team show`
  - `vibex team init --org <name>`
  - `vibex team defaults set ...`
  - `vibex team preset set <name> ...`
  - `vibex team preset clear <name>`
- Add governance coverage in core, CLI, and server tests.

## 1.7.0

- Add stable-core hardening artifacts:
  - `CONTRACTS.md`
  - `MIGRATIONS.md`
  - `benchmarks/context-baseline.json`
- Add benchmark regression checker:
  - `npm run bench:check`
- Add release hardening workflow command:
  - `npm run release:hardening`
- Add release-hardening tests that verify contract/migration docs and baseline artifact integrity.

## 1.6.0

- Add prompt policy system with `strict`, `balanced`, and `minimal` modes.
- Add per-repo default policy config in `.vibex/config.json`.
- Add CLI policy controls:
  - `vibex policy show`
  - `vibex policy set <strict|balanced|minimal>`
- Wire policy defaults into CLI and API optimization paths with `--policy` override support.
- Add policy validation and coverage in compressor and CLI tests.

## 1.5.0

- Add persistent hotkey profiles in `.vibex/hotkey.json`.
- Add `vibex hotkey profile` subcommands:
  - `show`
  - `set` (target/include/exclude/context)
  - `clear`
- Wire `vibex hotkey listen` to load profile defaults with CLI override support.
- Add unit and CLI coverage for hotkey profile lifecycle.

## 1.4.0

- Add native terminal hotkey listener mode:
  - `vibex hotkey listen`
- Add keypress-action parser for Ctrl+G optimize / Enter submit / Ctrl+C exit flows.
- Add CLI guard for TTY-only listener execution and dedicated listener tests.

## 1.3.0

- Add editor wrapper installer command:
  - `vibex ide install --editor vscode|cursor`
- Add stable VS Code/Cursor integration snippets for `tasks.json` and `keybindings.json`.
- Extend CLI coverage for editor install flows.

## 1.2.0

- Add browser extension bridge command set:
  - `vibex browser install`
  - `vibex browser bridge`
- Add browser payload plugin with stable `replace-prompt` message contract.
- Add `POST /bridge/browser` API endpoint for browser extension integrations.
- Add CLI and API tests for browser bridge flows.

## 1.1.0

- Expand framework fixture coverage with Angular, SvelteKit, and Nuxt projects.
- Add Nuxt detection to project-memory framework + stack inference.
- Strengthen regression coverage for framework-specific context scanning.

## 1.0.0

- Add `vibex hotkey install` with shell snippets for `bash`, `zsh`, `fish`, and `powershell`.
- Add stdin prompt support so `vibex` can optimize piped input without positional prompt args.
- Add CLI tests for hotkey snippet output and stdin optimization flow.

## 0.9.0

- Add `vibex terminal install` to print shell wrapper snippets (`bash`, `zsh`, `fish`, `powershell`).
- Add `vibex terminal preview` to return terminal-ready optimize previews.
- Add `vibex ide replace` to emit active-input replacement payloads.
- Add `POST /bridge/ide` and `POST /bridge/terminal` API endpoints.
- Add CLI and server coverage for all new bridge flows.

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
