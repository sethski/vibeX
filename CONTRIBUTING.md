# Contributing to vibeX

vibeX is local-first and community-oriented. Contributions should keep the tool deterministic, privacy-preserving, and useful for everyday AI coding workflows.

## Principles

- No external LLM calls by default.
- No telemetry.
- Store derived metadata only, never raw prompts or chat text.
- Prefer small, composable modules with stable interfaces.
- Keep integrations low-risk until they are reliable across platforms.

## Setup

```bash
npm install
npm test
```

## Pull Requests

Before opening a PR:

```bash
npm run typecheck
npm test
npm run build
```

Include tests for behavior changes. For privacy-sensitive changes, describe what data is read, stored, and never stored.
