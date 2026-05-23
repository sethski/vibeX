# vibeX Stable Contracts

This document defines stable public contracts for `v1.9.x`.

## CLI Contract

### Core optimize

```bash
vibex [--json] [--target codex|claude|cursor|copilot] [--policy strict|balanced|minimal] [--preset <name>] "<prompt>"
```

- `--json` output keys:
  - `optimized: string`
  - `copied: boolean`
  - `target: "codex" | "claude" | "cursor" | "copilot"`

### Compare

```bash
vibex compare --json "<prompt>"
```

- JSON output keys:
  - `optimized: string`
  - `rawTokens: number`
  - `optimizedTokens: number`
  - `reductionPercent: number`
  - `copied: boolean`
  - `target: ...`

### Preview / Explain

```bash
vibex preview --json [--explain] "<prompt>"
vibex explain --json "<prompt>"
```

- JSON output keys:
  - `optimized: string`
  - `tokenEstimate: number`
  - `contextUsed: string[]`
  - `context: Array<{ key, label, included, confidence, value?, reason }>`
  - `copied: boolean`
  - `target: ...`

### Score

```bash
vibex score --json "<prompt>"
```

- JSON output keys:
  - `optimized: string`
  - `tokenEstimate: number`
  - `contextUsed: string[]`
  - `target: ...`
  - `quality: { score, grade, components }`

### Policy

```bash
vibex policy show
vibex policy set strict|balanced|minimal
```

- Repo defaults are persisted in `.vibex/config.json`.

### Team Governance

```bash
vibex team show
vibex team init --org <name>
vibex team defaults set [--target ...] [--policy ...] [--include ...] [--exclude ...]
vibex team preset set <name> [--target ...] [--policy ...] [--include ...] [--exclude ...]
vibex team preset clear <name>
```

- Team defaults/presets are persisted in `.vibex/team.json`.
- Merge order is deterministic:
  - base defaults
  - team defaults
  - team preset
  - repo config overrides
  - explicit request options

## HTTP API Contract

### `POST /optimize`

Request:

```json
{
  "prompt": "fix auth",
  "context": {},
  "options": {
    "target": "codex",
    "policy": "balanced"
  }
}
```

Response:

```json
{
  "optimized": "Fix auth ...",
  "analysis": { "isVague": true, "confidence": 0.7, "reasons": [] },
  "tokenEstimate": 42,
  "contextUsed": ["stack", "activeFile"]
}
```

### `POST /preview`

Same request shape as `/optimize`, with response keys:
- `optimized`
- `analysis`
- `tokenEstimate`
- `contextUsed`
- `context`

### `POST /score`

Same request shape as `/optimize`, with response keys:
- `optimized`
- `tokenEstimate`
- `contextUsed`
- `quality`

### Bridge endpoints

- `POST /bridge/ide`:
  - `{ "version": 1, "replacement": { "range": "active-input", "text": "..." } }`
- `POST /bridge/terminal`:
  - `{ "shouldOffer": true, "preview": "...", "optimized": "..." }`
- `POST /bridge/browser`:
  - `{ "version": 1, "action": "replace-prompt", "target": "...", "text": "..." }`

## Stability Guarantees

- Backward-compatible additive changes are allowed.
- Removing documented keys or changing key types requires a major-version migration note.
