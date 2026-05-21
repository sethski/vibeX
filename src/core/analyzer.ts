import { VAGUE_TRIGGER_WORDS } from "../config/defaults.js";
import type { AnalysisReason, AnalysisResult } from "../types.js";

const VAGUE_REFERENCES = /\b(thing|stuff|it|this|that|weird)\b/i;

export function analyzePrompt(raw: string): AnalysisResult {
  const prompt = raw.trim();
  const words = prompt.split(/\s+/).filter(Boolean);
  const lower = prompt.toLowerCase();
  const reasons: AnalysisReason[] = [];

  if (words.length > 0 && words.length < 8) {
    reasons.push("short_prompt");
  }

  if (VAGUE_TRIGGER_WORDS.some((word) => lower.includes(word))) {
    reasons.push("trigger_word");
  }

  if (VAGUE_REFERENCES.test(prompt)) {
    reasons.push("vague_reference");
  }

  const confidence = Math.min(1, reasons.length * 0.5 + (words.length < 4 ? 0.2 : 0));

  return {
    isVague: confidence >= 0.5,
    confidence,
    reasons
  };
}
