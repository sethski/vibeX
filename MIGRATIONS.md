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
