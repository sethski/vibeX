import type { TargetProfile } from "../types.js";

const PROFILES: Record<TargetProfile, (prompt: string) => string> = {
  codex: (prompt) => prompt,
  claude: (prompt) => `Think briefly, then edit. ${prompt}`,
  cursor: (prompt) => `Use open files and current selection first. ${prompt}`,
  copilot: (prompt) => `Apply as focused code changes. ${prompt}`
};

export function applyTargetProfile(prompt: string, target: string = "codex"): string {
  if (!isTargetProfile(target)) {
    throw new Error(`Unsupported target: ${target}`);
  }

  return PROFILES[target](prompt);
}

export function isTargetProfile(target: string): target is TargetProfile {
  return target === "codex" || target === "claude" || target === "cursor" || target === "copilot";
}
