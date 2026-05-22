# vibeX

Universal prompt optimizer and context bridge for AI coding tools.

Type vague, get precise, save tokens, ship faster. vibeX runs locally, reads only high-signal project metadata, and rewrites vague coding prompts into compact instructions for tools like Codex, Claude, Cursor, Copilot, and terminal agents.

## Status

v1.6 MVP:

- Deterministic prompt analysis and compression
- Project memory in `.vibex/cache.json`
- CLI prompt optimization
- Low-token target aliases for Codex, Claude, Cursor, and Copilot
- `vibex doctor` environment checks
- Optional clipboard output with `--copy`
- Preview mode with include/exclude context controls
- Context engine: package manager, framework, source/test roots, tsconfig aliases, import neighbors
- Framework fixtures for Next.js, Vite React, pnpm monorepo, Angular, SvelteKit, and Nuxt
- `vibex compare --json` for raw vs optimized token estimates
- Prompt policy system (`strict`, `balanced`, `minimal`) with per-repo defaults
- Confidence scores per context item in preview output
- `vibex explain --json` for decision traces
- Low-confidence fallback prompt policy
- Diff intelligence with compact high-signal summaries
- Error intelligence with fingerprint dedupe
- Workspace topology detection (`pnpm-workspace.yaml`, `package.json#workspaces`)
- Active-file package-root targeting for monorepos
- Per-package project-memory cache files under `.vibex/`
- Terminal bridge commands (`terminal install`, `terminal preview`)
- IDE bridge commands (`ide replace`, `ide install`)
- Hotkey helper command (`hotkey install`)
- Native hotkey listener command (`hotkey listen`)
- Hotkey profile commands (`hotkey profile show|set|clear`)
- Stdin optimization flow for shell piping/hotkeys
- Browser bridge commands (`browser install`, `browser bridge`)
- Bridge API endpoints (`/bridge/ide`, `/bridge/terminal`)
- Browser bridge API endpoint (`/bridge/browser`)
- Localhost `/optimize` API
- Localhost `/preview` API
- Local-only processing with no telemetry and no external LLM calls

## Install

```bash
npm install
npm run build
```

## CLI

```bash
npm run build
node dist/src/cli.js "hey can you please fix the weird redirect thing"
```

Example output:

```text
Fix weird redirect thing | Stack: typescript | Preserve existing style/tests. Output changed lines only. No markdown.
```

Scan project memory:

```bash
node dist/src/cli.js scan
node dist/src/cli.js scan --json
node dist/src/cli.js cache show
node dist/src/cli.js cache clear
```

Context snapshot:

```bash
node dist/src/cli.js context --json
node dist/src/cli.js context --json --active-file src/cli.ts
```

Compare prompt token usage:

```bash
node dist/src/cli.js compare --json "please fix auth redirect issue"
```

Policy:

```bash
node dist/src/cli.js policy show
node dist/src/cli.js policy set strict
node dist/src/cli.js --policy minimal "fix auth"
```

JSON output:

```bash
node dist/src/cli.js --json "fix auth"
```

Target aliases:

```bash
node dist/src/cli.js --target codex "fix auth"
node dist/src/cli.js --target claude "fix auth"
node dist/src/cli.js --target cursor "fix auth"
node dist/src/cli.js --target copilot "fix auth"
```

Target aliases validate the destination tool name but do not add wrapper instructions. The target AI uses its own model; vibeX only sends the compact optimized prompt.

Clipboard mode:

```bash
node dist/src/cli.js --copy "fix auth"
```

Doctor:

```bash
node dist/src/cli.js doctor
node dist/src/cli.js doctor --json
```

Preview:

```bash
node dist/src/cli.js preview "fix auth"
node dist/src/cli.js preview --json "fix auth"
node dist/src/cli.js preview --include stack,file "fix auth"
node dist/src/cli.js preview --exclude diff,error --explain "fix auth"
```

Terminal bridge:

```bash
node dist/src/cli.js terminal install --shell bash
node dist/src/cli.js terminal preview --json "fix auth"
```

IDE bridge:

```bash
node dist/src/cli.js ide replace --json "fix auth"
node dist/src/cli.js ide install --json --editor vscode
node dist/src/cli.js ide install --json --editor cursor
```

Hotkey helper:

```bash
node dist/src/cli.js hotkey install --shell bash
node dist/src/cli.js hotkey install --shell powershell
node dist/src/cli.js hotkey listen --target codex
node dist/src/cli.js hotkey profile set --target cursor --include stack,file
node dist/src/cli.js hotkey profile show
```

Browser bridge:

```bash
node dist/src/cli.js browser install
node dist/src/cli.js browser bridge --json "fix auth"
```

Stdin mode:

```bash
echo "fix auth middleware redirect loop" | node dist/src/cli.js --json
```

Context controls:

- `stack`: framework/package metadata
- `file`: active file and optional cursor line
- `diff`: git diff summary
- `error`: recent local error log, only for debug-like prompts
- `neighbors`: nearby import/export files

vibeX always uses internal token-efficient trimming. User-facing token budget flags are intentionally not exposed.

## Server

```bash
npm run build
node dist/src/bridge/server.js
```

```bash
curl -X POST http://127.0.0.1:7742/optimize \
  -H "content-type: application/json" \
  -d "{\"prompt\":\"fix auth\",\"context\":{\"activeFile\":\"src/auth.ts\",\"stack\":[\"node\"]}}"

curl -X POST http://127.0.0.1:7742/bridge/ide \
  -H "content-type: application/json" \
  -d "{\"prompt\":\"fix auth\",\"context\":{\"activeFile\":\"src/auth.ts\",\"stack\":[\"node\"]}}"

curl -X POST http://127.0.0.1:7742/bridge/terminal \
  -H "content-type: application/json" \
  -d "{\"prompt\":\"fix auth\",\"context\":{\"activeFile\":\"src/auth.ts\",\"stack\":[\"node\"]}}"

curl -X POST http://127.0.0.1:7742/bridge/browser \
  -H "content-type: application/json" \
  -d "{\"prompt\":\"fix auth\",\"context\":{\"activeFile\":\"src/auth.ts\",\"stack\":[\"node\"]},\"options\":{\"target\":\"cursor\"}}"
```

## Project Memory

`vibex scan` writes `.vibex/cache.json`. The cache stores derived repo metadata only:

- stack names
- framework identifier
- package manager
- npm scripts
- likely test command
- source roots
- test roots
- tsconfig aliases
- framework marker files

It does not store raw prompts, chat text, clipboard text, terminal history, secrets, or source file contents. `.vibex/` is gitignored by default.

For monorepos, vibeX detects workspace packages and can read/write per-package cache entries automatically when context includes an `--active-file` in a workspace package.

## Development

```bash
npm test
npm run typecheck
npm run build
npm run pack:dry
npm run bench:context
```

## Roadmap

- Stable Core release hardening pack (contracts + migration notes + benchmark baselines)
- Team config and governance layer
- Quality scoring and regression gates
- Plugin/Hook SDK
- Incremental performance pass
- Security and compliance hardening
- Multi-language deep support
- Local-only telemetry dashboard (opt-in)
- Platform maturity release

## License

MIT
