"""Local output validator with constraint checks."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re


@dataclass(slots=True)
class ValidateResult:
    valid: bool
    violations: list[str]
    retry_prompt: str | None


def validate_output(cleaned_output: str, project_root: Path, constraints: list[str] | None = None) -> ValidateResult:
    constraints = constraints or []
    violations: list[str] = []
    lines = cleaned_output.splitlines()

    if "diff-only" in constraints:
        has_diff = any(
            line.startswith("diff ")
            or line.startswith("@@")
            or re.match(r"^[+-][^+-]", line.strip())
            for line in lines
        )
        if not has_diff:
            violations.append("diff-only-violation")

    refs = _collect_refs(cleaned_output)
    for ref in refs:
        if not (project_root / ref).exists():
            violations.append(f"missing-file:{ref}")

    retry_prompt = None if not violations else f"↻ fix output violations: {', '.join(violations)}"
    return ValidateResult(valid=not violations, violations=violations, retry_prompt=retry_prompt)


def _collect_refs(text: str) -> list[str]:
    refs = set()
    for match in re.finditer(r"(?:a/|b/)?([A-Za-z0-9._/-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|json|md))", text):
        refs.add(match.group(1))
    return sorted(refs)

