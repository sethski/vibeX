import { loadRulesConfig } from "../config/spec2.js";

export interface SanitizeResult {
  cleanedOutput: string;
  violations: string[];
}

export async function sanitizeOutput(
  aiOutput: string,
  constraints: string[] = [],
  root = process.cwd()
): Promise<SanitizeResult> {
  const rules = await loadRulesConfig(root);
  const violations: string[] = [];
  const keepDiffOnly = constraints.includes("diff-only");
  const noExplanations = constraints.includes("no-explanations");
  const requiredTag = rules.outputRules?.requiredTag ?? "[OUTPUT: diff-only | no-explanations | exact-line-refs]";

  let lines = aiOutput.split(/\r?\n/);
  if (noExplanations) {
    lines = lines.filter((line) => !/^\s*(here('| i)s|note that|you should|let('|’)s)\b/i.test(line));
  }

  if (keepDiffOnly) {
    const diffLines = lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith("diff ")
        || trimmed.startsWith("@@")
        || trimmed.startsWith("--- ")
        || trimmed.startsWith("+++ ")
        || /^[+-][^+-]/.test(trimmed)
        || trimmed.startsWith("```diff")
        || trimmed === "```";
    });
    if (diffLines.length === 0) {
      violations.push("missing-diff-content");
    } else {
      lines = diffLines;
    }
  }

  const cleaned = lines.join("\n").trim();
  const cleanedOutput = cleaned ? `${requiredTag}\n${cleaned}` : requiredTag;
  return { cleanedOutput, violations };
}
