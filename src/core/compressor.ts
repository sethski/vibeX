import { DEBUG_TRIGGER_WORDS, DEFAULT_MAX_TOKENS, FILLER_WORDS } from "../config/defaults.js";
import type { CompressionOptions, CompressionResult, ProjectContext } from "../types.js";
import { estimateTokenCount } from "./tokens.js";
import { normalizePolicy } from "./policy.js";

export function compressPrompt(raw: string, context: ProjectContext, options: CompressionOptions = {}): CompressionResult {
  const policy = normalizePolicy(options.policy);
  const maxTokens = DEFAULT_MAX_TOKENS;
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

  const includeErrors = policy === "strict" || (policy === "balanced" && isDebugPrompt(raw));
  if (includeErrors && context.recentErrors.length > 0) {
    parts.push(`Error: ${context.recentErrors[context.recentErrors.length - 1]}`);
    contextUsed.push("recentErrors");
  }

  if (policy !== "minimal" && context.importNeighbors.length > 0) {
    parts.push(`Neighbors: ${context.importNeighbors.slice(0, 2).join(" ")}`);
    contextUsed.push("importNeighbors");
  }

  if (policy === "strict" && context.gitSummary.trim()) {
    parts.push(`Diff: ${context.gitSummary.trim()}`);
    contextUsed.push("gitSummary");
  }

  parts.push(policyTail(policy));

  return trimToBudget(parts, maxTokens, contextUsed, policy);
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

function trimToBudget(
  parts: string[],
  maxTokens: number,
  contextUsed: string[],
  policy: ReturnType<typeof normalizePolicy>
): CompressionResult {
  const mutable = [...parts];
  const removableLabels = policy === "strict"
    ? ["Neighbors:", "Diff:", "Error:"]
    : policy === "minimal"
    ? ["Error:", "Neighbors:", "Diff:"]
    : ["Diff:", "Neighbors:", "Error:"];

  for (const label of removableLabels) {
    if (estimateTokenCount(mutable.join(" | ")) <= maxTokens) {
      break;
    }
    const index = mutable.findIndex((part) => part.startsWith(label));
    if (index >= 0) {
      mutable.splice(index, 1);
      removeContextLabel(label, contextUsed);
    }
  }

  let optimized = mutable.join(" | ");
  while (estimateTokenCount(optimized) > maxTokens && optimized.includes(" ")) {
    optimized = optimized.split(/\s+/).slice(0, -1).join(" ");
  }

  return {
    optimized,
    tokenEstimate: estimateTokenCount(optimized),
    contextUsed
  };
}

function policyTail(policy: ReturnType<typeof normalizePolicy>): string {
  if (policy === "strict") {
    return "Preserve existing style/tests. Be explicit and deterministic. Output changed lines only. No markdown.";
  }
  if (policy === "minimal") {
    return "Preserve style/tests. Keep response minimal and direct. No markdown.";
  }
  return "Preserve existing style/tests. Output changed lines only. No markdown.";
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
