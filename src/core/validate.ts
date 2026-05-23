import { stat } from "node:fs/promises";
import { join } from "node:path";

export interface ValidateResult {
  valid: boolean;
  violations: string[];
  retryPrompt: string | null;
}

export interface ValidateOptions {
  projectRoot: string;
  constraints?: string[];
}

export async function validateOutput(
  cleanedOutput: string,
  options: ValidateOptions
): Promise<ValidateResult> {
  const violations: string[] = [];
  const constraints = options.constraints ?? [];
  const lines = cleanedOutput.split(/\r?\n/);

  if (constraints.includes("diff-only")) {
    const hasDiff = lines.some((line) => line.startsWith("diff ") || line.startsWith("@@") || /^[+-][^+-]/.test(line.trim()));
    if (!hasDiff) {
      violations.push("diff-only-violation");
    }
  }

  if (constraints.includes("no-explanations")) {
    const hasProse = lines.some((line) => /^\s*(here('| i)s|note that|you should)\b/i.test(line));
    if (hasProse) {
      violations.push("no-explanations-violation");
    }
  }

  const referenced = collectFileRefs(cleanedOutput);
  for (const file of referenced) {
    const exists = await fileExists(join(options.projectRoot, file));
    if (!exists) {
      violations.push(`missing-file:${file}`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    retryPrompt: violations.length === 0 ? null : `↻ fix output violations: ${violations.join(", ")}`
  };
}

function collectFileRefs(text: string): string[] {
  const refs = new Set<string>();
  const regex = /(?:a\/|b\/)?([A-Za-z0-9._/-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|json|md))/g;
  for (const match of text.matchAll(regex)) {
    refs.add(match[1]);
  }
  return [...refs];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}
