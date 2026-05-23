"""Local intent cache with pruning and thread-safe writes."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

_LOCK = Lock()


@dataclass(slots=True)
class IntentTriple:
    key: str
    raw_prompt: str
    stp_prompt: str
    ai_output: str
    updated_at: str


class IntentCache:
    def __init__(self, cache_file: Path, max_entries: int = 500) -> None:
        self.cache_file = cache_file
        self.max_entries = max_entries
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)

    def put(self, raw_prompt: str, stp_prompt: str, ai_output: str) -> None:
        key = hashlib.sha256(raw_prompt.encode("utf-8")).hexdigest()
        with _LOCK:
            doc = self._load()
            entries: list[dict[str, str]] = [entry for entry in doc["entries"] if entry["key"] != key]
            entries.insert(
                0,
                asdict(
                    IntentTriple(
                        key=key,
                        raw_prompt=raw_prompt,
                        stp_prompt=stp_prompt,
                        ai_output=ai_output,
                        updated_at=datetime.now(tz=timezone.utc).isoformat(),
                    )
                ),
            )
            doc["entries"] = entries[: self.max_entries]
            self._save(doc)

    def get(self, raw_prompt: str) -> dict[str, str] | None:
        key = hashlib.sha256(raw_prompt.encode("utf-8")).hexdigest()
        doc = self._load()
        for entry in doc["entries"]:
            if entry["key"] == key:
                return entry
        return None

    def _load(self) -> dict[str, object]:
        if not self.cache_file.exists():
            return {"version": 1, "entries": []}
        return json.loads(self.cache_file.read_text(encoding="utf-8"))

    def _save(self, doc: dict[str, object]) -> None:
        temp = self.cache_file.with_suffix(".tmp")
        temp.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
        temp.replace(self.cache_file)

