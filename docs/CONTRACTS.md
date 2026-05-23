# vibeX Stable Contracts

This document defines stable public contracts for `v1.10.x`.

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

### STP / Sanitize / Validate

```bash
vibex stp [--json] "<prompt>"
vibex sanitize [--json] [--constraints diff-only,no-explanations] "<ai_output>"
vibex validate [--json] [--retry] [--constraints ...] [--project-root <path>] "<cleaned_or_raw_output>"
```

- `vibex stp --json` keys:
  - `stp_prompt: string`
  - `model_flag: string | null`
- `vibex sanitize --json` keys:
  - `cleaned_output: string`
  - `violations: string[]`
- `vibex validate --json` keys:
  - `valid: boolean`
  - `violations: string[]`
  - `retry_prompt?: string | null`
  - `cleaned_output?: string`
  - `warning?: string | null`

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
  "contextUsed": ["stack", "activeFile"],
  "stp_prompt": "→ fix @src/auth.ts | # node | ✓ diff-only | no-explanations | exact-line-refs",
  "model_flag": "--model haiku",
  "state_anchor": "[GOAL] ...\n[DONE] ...\n[NEXT] ...",
  "confidence": 0.7
}
```

`POST /optimize` also accepts SPEC2 aliases:

```json
{
  "raw_prompt": "fix auth",
  "ide_context": { "file": "src/auth.ts", "line_start": 42, "stack": "Next14", "error": "session undefined" }
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

### `POST /sanitize`

Request:
- `ai_output: string`
- `constraints?: string[]`

Response:
- `cleaned_output: string`
- `violations: string[]`

### `POST /validate`

Request:
- direct validation:
  - `cleaned_output: string`
  - `project_root: string`
  - `constraints?: string[]`
- retry validation:
  - `ai_output: string`
  - `project_root: string`
  - `constraints?: string[]`

Response:
- `valid: boolean`
- `violations: string[]`
- `retry_prompt: string | null`
- optional `cleaned_output` and `warning` for retry mode

### Browser / Tray Contracts

- Browser watcher/bookmarklet contract is exposed by `src/plugins/browser.ts`:
  - watcher channel `vibex-browser`
  - request/response events:
    - `vibex.optimize.request`
    - `vibex.optimize.response`
- Tray contract is exposed by `src/ui/tray.ts` and includes:
  - server health
  - optimize enable/disable
  - auth mode
  - cache actions

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
- If `VIBEX_AUTH_TOKEN` is set, `POST /optimize`, `POST /sanitize`, and `POST /validate` require `x-vibex-token` or bearer auth.
