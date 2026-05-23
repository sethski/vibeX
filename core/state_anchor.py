"""Three-line state anchor for low-token continuity."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class StateAnchor:
    goal: str
    done: str
    next: str

    def to_prompt(self) -> str:
        return f"[GOAL] {self.goal}\n[DONE] {self.done}\n[NEXT] {self.next}"


def build_state_anchor(raw_prompt: str, optimized_prompt: str, previous: StateAnchor | None = None) -> StateAnchor:
    if previous:
        goal = previous.goal
        done = previous.done
        next_step = previous.next
    else:
        goal = f"Fix {raw_prompt.strip()}" if raw_prompt.strip() else "Fix pending task"
        done = "Pending"
        next_step = "Apply minimal diff and run tests"

    if "File:" in optimized_prompt:
        done = "Prepared scoped patch instructions"
    if "Error:" in optimized_prompt:
        next_step = "Patch failing path and re-run checks"

    return StateAnchor(goal=goal, done=done, next=next_step)

