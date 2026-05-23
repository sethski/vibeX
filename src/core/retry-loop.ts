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
    current = `${sanitized.cleanedOutput}\n# retry: ${validated.retryPrompt ?? "constraint-check"}`;
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
