import { FILLER_WORDS } from "../config/defaults.js";

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.25);
}

export function compactPrompt(raw: string): string {
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

export function compareTokenUsage(raw: string, optimized: string): {
  rawTokens: number;
  optimizedTokens: number;
  reductionPercent: number;
} {
  const rawTokens = estimateTokenCount(raw);
  const optimizedTokens = estimateTokenCount(optimized);
  const reductionPercent = rawTokens === 0 ? 0 : Math.max(0, Math.round(((rawTokens - optimizedTokens) / rawTokens) * 100));
  return {
    rawTokens,
    optimizedTokens,
    reductionPercent
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
