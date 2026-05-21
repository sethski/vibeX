import type { TargetProfile } from "../types.js";

export function applyTargetProfile(prompt: string, target: string = "codex"): string {
  if (!isTargetProfile(target)) {
    throw new Error(`Unsupported target: ${target}`);
  }

  return prompt;
}

export function isTargetProfile(target: string): target is TargetProfile {
  return target === "codex" || target === "claude" || target === "cursor" || target === "copilot";
}
