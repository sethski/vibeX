# vibeX Migration Notes

## v0.6 -> v0.7

- No breaking interface changes.
- Context internals gained smarter diff/error extraction.

## v0.7 -> v0.8

- Monorepo-aware cache behavior introduced.
- `.vibex/cache.json` may coexist with per-package cache files.

## v0.8 -> v0.9

- Integration commands added (`terminal`, `ide`, bridge endpoints).
- No removal of existing optimize APIs.

## v0.9 -> v1.0

- Hotkey helper snippets and stdin optimize mode added.
- Existing CLI commands remain compatible.

## v1.0 -> v1.5

- Additional bridge and hotkey profile commands were added.
- Default optimize output format stayed stable.

## v1.5 -> v1.6

- Policy system added (`strict`, `balanced`, `minimal`).
- Repo default policy stored in `.vibex/config.json`.
- Existing commands continue to work without specifying policy.

## v1.6 -> v1.7

- Stable contracts documented in `CONTRACTS.md`.
- Benchmark baseline artifacts added under `benchmarks/`.
- New release-hardening checks added, no runtime contract breaks.

## v1.7 -> v1.8

- Team governance config added in `.vibex/team.json`.
- New team commands and `--preset` option added for deterministic policy/target inheritance.
- Existing optimize usage remains valid; new behavior is additive when team config is present.

## v1.8 -> v1.9

- Add `vibex score` for deterministic prompt quality scoring.
- Add `POST /score` API endpoint for machine-readable quality reports.
- Add optimization snapshot gate artifact (`benchmarks/optimization-snapshots.json`) and `npm run quality:gate`.
- Release hardening now runs quality gating in addition to tests/typecheck/benchmark/pack checks.

## v1.9 -> v1.10

- Add SPEC2 hybrid scaffolding with Python core modules under `core/*.py` and wrapper plugin under `plugins/claude.py`.
- Add root JSON config surface (`config/defaults.json`, `config/rules.json`, `config/models.json`) used by new STP/router/sanitize/validate flows.
- `POST /optimize` remains backward compatible and now also accepts SPEC2 aliases (`raw_prompt`, `ide_context`).
- Add `POST /sanitize` and `POST /validate`.
- Add optional auth token protection (`VIBEX_AUTH_TOKEN`) for optimize/sanitize/validate endpoints.
- Add CLI commands `stp`, `sanitize`, `validate`, plus `/vibe` alias support.

## v1.10 -> v1.10.1

- Add tray and browser watcher/bookmarklet contracts for v0.3 adapter surfaces.
- Add SPEC2 acceptance matrix script and include it in release hardening.
- Tighten sanitizer/validator/retry heuristics for diff extraction, import/path checks, and deterministic correction prompts.
