<div align="center">
  <img src="assets/vibex-logo.png" alt="vibeX logo" width="140" />
  
Local-first prompt optimizer for coding assistants.

## Install

Quick run (no install):

```bash
npx @sethski/vibex "<your prompt>"
```

Global CLI:

```bash
npm i -g @sethski/vibex
vibex "<your prompt>"
```

## Use by Tool

### CLI (generic)

```bash
vibex --json "<your prompt>"
```

Cross-shell helper (`vibe`/`vx`) with prompt suggestions:

```bash
vibex terminal install --shell bash
# use zsh | fish | powershell as needed
```

### Cursor

```bash
vibex ide install --editor cursor
vibex --target cursor "<your prompt>"
```

### Claude

```bash
vibex --target claude "<your prompt>"
```

### Codex

```bash
vibex --target codex "<your prompt>"
```

## Local API

Start server:

```bash
npm run build
node dist/src/bridge/start.js
```

Health check:

```bash
curl http://127.0.0.1:7742/health
```

Optimize:

```bash
curl -X POST http://127.0.0.1:7742/optimize \
  -H "content-type: application/json" \
  -d "{\"prompt\":\"<your prompt>\",\"context\":{\"activeFile\":\"src/file.ts\"}}"
```

Also available: `POST /sanitize`, `POST /validate`, `POST /preview`, `POST /score`.

## Notes

- Local processing only (no external LLM calls, no telemetry).
- Token-efficient by default (no max-token flag).
- Hybrid architecture: TypeScript runtime + Python core modules in `core/*.py`.
- License: MIT ([LICENSE](LICENSE)).
- Extra docs: [docs/CHANGELOG.md](docs/CHANGELOG.md), [docs/CONTRACTS.md](docs/CONTRACTS.md), [docs/MIGRATIONS.md](docs/MIGRATIONS.md).
