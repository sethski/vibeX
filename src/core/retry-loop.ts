import { loadDefaultsConfig } from "../config/spec2.js";
import { sanitizeOutput } from "./sanitize.js";
import { validateOutput } from "./validate.js";

export interface RetryLoopResult {
  cleanedOutput: string;
  valid: boolean;
  violations: string[];
  attempts: number;
  warning?: string;
}

export async function sanitizeValidateWithRetry(
  aiOutput: string,
  constraints: string[],
  projectRoot: string
): Promise<RetryLoopResult> {
  const defaults = await loadDefaultsConfig(projectRoot);
  const maxAttempts = defaults.retryLimits?.maxAttempts ?? 2;
  let attempt = 0;
  let current = aiOutput;
  let lastViolations: string[] = [];

  while (attempt <= maxAttempts) {
    const sanitized = await sanitizeOutput(current, constraints, projectRoot);
    const validated = await validateOutput(sanitized.cleanedOutput, { projectRoot, constraints });
    if (validated.valid) {
      return {
        cleanedOutput: sanitized.cleanedOutput,
        valid: true,
        violations: [],
        attempts: attempt
      };
    }
    lastViolations = validated.violations;
    current = `${sanitized.cleanedOutput}\n# retry: ${buildDeterministicRetryPrompt(validated.violations)}`;
    attempt += 1;
  }

  const fallback = await sanitizeOutput(aiOutput, constraints, projectRoot);
  return {
    cleanedOutput: `${fallback.cleanedOutput}\n⚠️ constraint-violation`,
    valid: false,
    violations: lastViolations,
    attempts: maxAttempts,
    warning: "constraint-violation"
  };
}

function buildDeterministicRetryPrompt(violations: string[]): string {
  const canonical = [...new Set(violations)].sort();
  if (canonical.length === 0) {
    return "constraint-check";
  }
  const tokens = canonical.map((violation) => {
    if (violation.startsWith("missing-file:")) {
      return "use-existing-files";
    }
    if (violation.startsWith("unknown-import:")) {
      return "use-existing-imports";
    }
    if (violation === "diff-only-violation") {
      return "diff-only";
    }
    if (violation === "no-explanations-violation") {
      return "no-prose";
    }
    if (violation === "exact-line-refs-violation") {
      return "add-line-refs";
    }
    return violation;
  });
  return `↻ ${tokens.join(" | ")}`;
}
