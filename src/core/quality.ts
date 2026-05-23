import type { PreviewResult, QualityReport } from "../types.js";
import { compareTokenUsage, estimateTokenCount } from "./tokens.js";

export function scoreOptimization(raw: string, preview: PreviewResult): QualityReport {
  const token = tokenEfficiencyScore(raw, preview.optimized);
  const context = contextCoverageScore(preview);
  const specificity = specificityScore(preview.optimized);
  const privacy = privacyScore(raw, preview.context.map((item) => item.value ?? ""));

  const score = clamp01(token * 0.35 + context * 0.25 + specificity * 0.25 + privacy * 0.15);
  return {
    score: round2(score),
    grade: gradeFor(score),
    components: {
      tokenEfficiency: round2(token),
      contextCoverage: round2(context),
      specificity: round2(specificity),
      privacy: round2(privacy)
    }
  };
}

function tokenEfficiencyScore(raw: string, optimized: string): number {
  const usage = compareTokenUsage(raw, optimized);
  if (usage.rawTokens <= 0) {
    return 1;
  }
  const ratio = usage.optimizedTokens / usage.rawTokens;
  return clamp01(1 - ratio);
}

function contextCoverageScore(preview: PreviewResult): number {
  const available = preview.context.filter((item) => item.confidence >= 0.35);
  if (available.length === 0) {
    return 0.5;
  }
  const included = available.filter((item) => item.included).length;
  return clamp01(included / available.length);
}

function specificityScore(optimized: string): number {
  const tokenCount = estimateTokenCount(optimized);
  const hasActionVerb = /\b(fix|add|remove|refactor|update|implement|debug|write|optimize)\b/i.test(optimized);
  const hasConstraint = /\b(output|preserve|tests|style|no markdown|minimal|changed lines)\b/i.test(optimized);
  const hasAnchor = /\b(stack|file|error|neighbors|diff)\b:/i.test(optimized);
  const lengthScore = tokenCount >= 6 && tokenCount <= 90 ? 1 : tokenCount < 6 ? 0.2 : 0.6;

  const weighted = (hasActionVerb ? 0.35 : 0) + (hasConstraint ? 0.35 : 0) + (hasAnchor ? 0.2 : 0) + (lengthScore * 0.1);
  return clamp01(weighted);
}

function privacyScore(raw: string, contextValues: string[]): number {
  const suspects = extractSecretLikeTokens(raw);
  if (suspects.length === 0) {
    return 1;
  }
  const surface = contextValues.join(" ").toLowerCase();
  const leaked = suspects.some((token) => surface.includes(token.toLowerCase()));
  return leaked ? 0 : 1;
}

function extractSecretLikeTokens(raw: string): string[] {
  return raw
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => /[A-Z0-9_]{8,}|=/.test(part));
}

function gradeFor(score: number): QualityReport["grade"] {
  if (score >= 0.9) {
    return "A";
  }
  if (score >= 0.8) {
    return "B";
  }
  if (score >= 0.7) {
    return "C";
  }
  if (score >= 0.6) {
    return "D";
  }
  return "F";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
