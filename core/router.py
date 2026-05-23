"""Local model routing with conservative hint injection."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path


@dataclass(slots=True)
class RouteDecision:
    tool: str
    model_flag: str | None
    compression_level: str
    fallback: str


def route(prompt: str, tool: str | None, config_path: Path) -> RouteDecision:
    tool_name = (tool or "auto").lower()
    config = _load_config(config_path)
    entry = config.get(tool_name, config.get("auto", {}))
    dense = "dense" if len(prompt.split()) < 10 else "balanced"
    model_flag = entry.get("modelFlag")
    if tool_name != "claude":
        model_flag = None
    return RouteDecision(
        tool=tool_name,
        model_flag=model_flag,
        compression_level=dense,
        fallback="auto",
    )


def _load_config(config_path: Path) -> dict[str, dict[str, str | None]]:
    if not config_path.exists():
        return {"auto": {"modelFlag": None}}
    return json.loads(config_path.read_text(encoding="utf-8"))

