"""Claude CLI wrapper with conservative haiku injection."""

from __future__ import annotations

import subprocess
from typing import Sequence


def build_command(base_args: Sequence[str], optimized_prompt: str, inject_haiku: bool = True) -> list[str]:
    args = list(base_args)
    if inject_haiku and "--model" not in args:
        args.extend(["--model", "haiku"])
    return args + ["-p", optimized_prompt]


def run_claude(base_args: Sequence[str], optimized_prompt: str) -> subprocess.CompletedProcess[str]:
    cmd = build_command(base_args, optimized_prompt, inject_haiku=True)
    return subprocess.run(cmd, text=True, capture_output=True, check=False)

