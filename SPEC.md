# vibeX v0.1 Spec

vibeX is a local-first prompt optimizer for AI coding tools. It turns vague prompts into compact, context-aware instructions without external LLM calls.

## v0.1 Scope

- TypeScript core modules for analysis, context, compression, formatting, and project memory.
- CLI commands for optimizing prompts and managing `.vibex/cache.json`.
- Localhost API with `GET /health` and `POST /optimize`.
- Bridge stubs for future terminal and IDE integrations.
- Practical OSS packaging: MIT license, README, contributing guide, CI, issue templates.

## Privacy

vibeX stores only derived project metadata in `.vibex/cache.json`. It never stores raw prompts, chat content, clipboard text, terminal history, secrets, or source file contents.

## Out Of Scope For v0.1

- Native global hotkey listeners.
- Browser extensions.
- Full VS Code/Cursor extension packaging.
- External AI refinement calls.
