# vibeX

Universal prompt optimizer and context bridge for AI coding tools.

Type vague, get precise, save tokens, ship faster. vibeX runs locally, reads only high-signal project metadata, and rewrites vague coding prompts into compact instructions for tools like Codex, Claude, Cursor, Copilot, and terminal agents.

## Status

v0.4 MVP:

- Deterministic prompt analysis and compression
- Project memory in `.vibex/cache.json`
- CLI prompt optimization
- Low-token target aliases for Codex, Claude, Cursor, and Copilot
- `vibex doctor` environment checks
- Optional clipboard output with `--copy`
- Preview mode with include/exclude context controls
- Context engine: package manager, framework, source/test roots, tsconfig aliases, import neighbors
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

## Development

```bash
npm test
npm run typecheck
npm run build
npm run pack:dry
```

## Roadmap

- Target-specific profiles for Codex, Claude, Cursor, and Copilot
- Context preview before optimization
- VS Code/Cursor extension wrapper
- Terminal shell integration
- Optional clipboard and hotkey helpers
- Project fixtures for framework-specific context detection

## License

MIT
