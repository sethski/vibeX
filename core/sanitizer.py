"""Output sanitizer for vibeX."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(slots=True)
class SanitizeResult:
    cleaned_output: str
    violations: list[str]


def sanitize_output(ai_output: str, constraints: list[str] | None = None) -> SanitizeResult:
    constraints = constraints or []
    lines = ai_output.splitlines()
    violations: list[str] = []

    if "no-explanations" in constraints:
        lines = [
            line
            for line in lines
            if not re.match(r"^\s*(here('| i)s|note that|you should|let's)\b", line, flags=re.IGNORECASE)
        ]

    if "diff-only" in constraints:
        diff_lines = [
            line
            for line in lines
            if line.startswith("diff ")
            or line.startswith("@@")
            or line.startswith("--- ")
            or line.startswith("+++ ")
            or re.match(r"^[+-][^+-]", line.strip())
            or line.strip() in {"```diff", "```"}
        ]
        if not diff_lines:
            violations.append("missing-diff-content")
        else:
            lines = diff_lines

    cleaned = "\n".join(lines).strip()
    return SanitizeResult(
        cleaned_output=cleaned if cleaned else "[OUTPUT: diff-only | no-explanations | exact-line-refs]",
        violations=violations,
    )

