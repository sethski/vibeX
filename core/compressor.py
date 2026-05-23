"""Local STP compressor for vibeX."""

from __future__ import annotations

from dataclasses import dataclass
import re

FILLER_WORDS = [
    "hey",
    "can you",
    "could you",
    "please",
    "i want",
    "i want you to",
    "like",
    "just",
    "maybe",
]


@dataclass(slots=True)
class CompressionContext:
    file: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    stack: str | None = None
    error: str | None = None


def compress_to_stp(raw_prompt: str, context: CompressionContext) -> str:
    intent = _compact(raw_prompt).lower()
    parts = [f"→ {intent}"]
    if context.file:
        if context.line_start and context.line_end:
            parts.append(f"@{context.file}:{context.line_start}-{context.line_end}")
        elif context.line_start:
            parts.append(f"@{context.file}:{context.line_start}")
        else:
            parts.append(f"@{context.file}")
    if context.stack:
        parts.append(f"# {context.stack}")
    if context.error:
        parts.append(f"! {context.error.strip()}")
    parts.append("✓ diff-only | no-explanations | exact-line-refs")
    return " | ".join(parts)


def _compact(text: str) -> str:
    out = text.strip()
    for filler in FILLER_WORDS:
        out = re.sub(rf"\b{re.escape(filler)}\b", " ", out, flags=re.IGNORECASE)
    out = re.sub(r"\s+", " ", out).strip()
    return out if out else "clarify request"

