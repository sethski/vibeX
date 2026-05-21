# vibeX

Universal prompt optimizer and context bridge for AI coding tools.

Type vague, get precise, save tokens, ship faster. vibeX runs locally, reads only high-signal project metadata, and rewrites vague coding prompts into compact instructions for tools like Codex, Claude, Cursor, Copilot, and terminal agents.

## Status

v0.2 MVP:

- Deterministic prompt analysis and compression
- Project memory in `.vibex/cache.json`
- CLI prompt optimization
- Low-token target aliases for Codex, Claude, Cursor, and Copilot
- `vibex doctor` environment checks
- Optional clipboard output with `--copy`
- Localhost `/optimize` API
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
node dist/src/cli.js cache show
node dist/src/cli.js cache clear
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
- package manager
- npm scripts
- likely test command
- source roots
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

## License

MIT
