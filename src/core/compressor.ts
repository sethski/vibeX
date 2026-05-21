import { DEBUG_TRIGGER_WORDS, DEFAULT_MAX_TOKENS, FILLER_WORDS } from "../config/defaults.js";
import type { CompressionOptions, CompressionResult, ProjectContext } from "../types.js";

export function compressPrompt(raw: string, context: ProjectContext, options: CompressionOptions = {}): CompressionResult {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const contextUsed: string[] = [];
  const parts: string[] = [toIntent(raw)];

  if (context.stack.length > 0) {
    parts.push(`Stack: ${context.stack.join(" ")}`);
    contextUsed.push("stack");
  }

  if (context.activeFile) {
    const file = context.cursorLine ? `${context.activeFile}:${context.cursorLine}` : context.activeFile;
    parts.push(`File: ${file}`);
    contextUsed.push("activeFile");
  }

  if (isDebugPrompt(raw) && context.recentErrors.length > 0) {
    parts.push(`Error: ${context.recentErrors[context.recentErrors.length - 1]}`);
    contextUsed.push("recentErrors");
  }

  if (context.gitSummary.trim()) {
    parts.push(`Diff: ${context.gitSummary.trim()}`);
    contextUsed.push("gitSummary");
  }

  if (context.importNeighbors.length > 0) {
    parts.push(`Neighbors: ${context.importNeighbors.slice(0, 2).join(" ")}`);
    contextUsed.push("importNeighbors");
  }

  parts.push("Preserve existing style/tests. Output changed lines only. No markdown.");

  return trimToBudget(parts, maxTokens, contextUsed);
}

function toIntent(raw: string): string {
  let prompt = raw.trim();
  for (const filler of FILLER_WORDS) {
    prompt = prompt.replace(new RegExp(`\\b${escapeRegExp(filler)}\\b`, "gi"), " ");
  }
  prompt = prompt.replace(/\s+/g, " ").trim();
  if (!prompt) {
    return "Clarify request";
  }
  return `${prompt.charAt(0).toUpperCase()}${prompt.slice(1)}`;
}

function isDebugPrompt(raw: string): boolean {
  const lower = raw.toLowerCase();
  return DEBUG_TRIGGER_WORDS.some((word) => lower.includes(word));
}

function trimToBudget(parts: string[], maxTokens: number, contextUsed: string[]): CompressionResult {
  const mutable = [...parts];
  const removableLabels = ["Diff:", "Neighbors:", "Error:"];

  for (const label of removableLabels) {
    if (estimateTokens(mutable.join(" | ")) <= maxTokens) {
      break;
    }
    const index = mutable.findIndex((part) => part.startsWith(label));
    if (index >= 0) {
      mutable.splice(index, 1);
      removeContextLabel(label, contextUsed);
    }
  }

  let optimized = mutable.join(" | ");
  while (estimateTokens(optimized) > maxTokens && optimized.includes(" ")) {
    optimized = optimized.split(/\s+/).slice(0, -1).join(" ");
  }

  return {
    optimized,
    tokenEstimate: estimateTokens(optimized),
    contextUsed
  };
}

function removeContextLabel(label: string, contextUsed: string[]): void {
  const map: Record<string, string> = {
    "Diff:": "gitSummary",
    "Neighbors:": "importNeighbors",
    "Error:": "recentErrors"
  };
  const index = contextUsed.indexOf(map[label]);
  if (index >= 0) {
    contextUsed.splice(index, 1);
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.25);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
