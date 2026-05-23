# vibeX

![vibeX logo](assets/vibex-logo.png)

Local-first prompt optimizer for coding assistants.

vibeX rewrites vague prompts into compact, high-signal instructions using local repo context.  
No external LLM calls. No telemetry.

## Install

```bash
npx @sethski/vibex "fix auth redirect loop"
```

Or install globally:

```bash
npm i -g @sethski/vibex
vibex "fix auth redirect loop"
```

From source:

```bash
git clone https://github.com/sethski/vibeX.git
cd vibeX
npm install
npm run build
```

## Run (Command)

```bash
node dist/src/cli.js "fix auth redirect loop"
```

JSON output:

```bash
node dist/src/cli.js --json "fix auth redirect loop"
```

Target aliases:

```bash
node dist/src/cli.js --target codex "fix auth"
node dist/src/cli.js --target claude "fix auth"
node dist/src/cli.js --target cursor "fix auth"
node dist/src/cli.js --target copilot "fix auth"
```

## Use as Plugin/Integration

Install lightweight adapters:

```bash
node dist/src/cli.js ide install --editor vscode
node dist/src/cli.js ide install --editor cursor
node dist/src/cli.js terminal install --shell bash
node dist/src/cli.js browser install
```

These integrate vibeX into IDE/terminal/browser flows without heavy extension runtime packaging.

## Run as Local API

```bash
node dist/src/bridge/server.js
```

Main endpoint:

```bash
curl -X POST http://127.0.0.1:7742/optimize \
  -H "content-type: application/json" \
  -d "{\"prompt\":\"fix auth\",\"context\":{\"activeFile\":\"src/auth.ts\"}}"
```

Also supports SPEC2 payload shape (`raw_prompt`, `ide_context`), plus `/sanitize` and `/validate`.

## Publish (Creator)

```bash
npm run publish:check
npm login
npm run publish:public
```

## Notes

- Token-efficient by default (no max-token flag required).
- Hybrid architecture: TypeScript runtime + Python core modules in `core/*.py`.
- License: MIT ([LICENSE](LICENSE)).
- Docs: [Changelog](docs/CHANGELOG.md), [Contracts](docs/CONTRACTS.md), [Migrations](docs/MIGRATIONS.md).
