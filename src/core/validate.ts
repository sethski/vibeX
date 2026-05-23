import { readFile, stat } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

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
  const packageNames = await loadPackageNames(options.projectRoot);

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

  if (constraints.includes("exact-line-refs")) {
    const hasLineRefs = lines.some((line) => /@@\s/.test(line) || /:\d+(-\d+)?\b/.test(line));
    if (!hasLineRefs) {
      violations.push("exact-line-refs-violation");
    }
  }

  const referenced = collectFileRefs(cleanedOutput);
  for (const file of referenced) {
    if (!isPathPlausible(file)) {
      violations.push(`invalid-file-ref:${file}`);
      continue;
    }
    const exists = await fileExists(join(options.projectRoot, file));
    if (!exists) {
      violations.push(`missing-file:${file}`);
    }
  }

  const imports = collectImportSpecifiers(cleanedOutput);
  for (const specifier of imports) {
    if (specifier.startsWith(".")) {
      if (referenced.length === 0) {
        violations.push(`unresolvable-relative-import:${specifier}`);
        continue;
      }
      const existingRef = referenced[0];
      if (!existingRef) {
        violations.push(`unresolvable-relative-import:${specifier}`);
        continue;
      }
      const resolved = await resolveRelativeImport(options.projectRoot, existingRef, specifier);
      if (!resolved) {
        violations.push(`unknown-import:${specifier}`);
      }
      continue;
    }

    const basePackage = normalizePackageName(specifier);
    if (!packageNames.has(basePackage)) {
      violations.push(`unknown-import:${specifier}`);
    }
  }

  const normalizedViolations = [...new Set(violations)].sort();

  return {
    valid: normalizedViolations.length === 0,
    violations: normalizedViolations,
    retryPrompt: normalizedViolations.length === 0 ? null : `↻ fix output violations: ${normalizedViolations.join(", ")}`
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

function isPathPlausible(file: string): boolean {
  const normalized = normalize(file).replace(/\\/g, "/");
  if (normalized.startsWith("../") || normalized.includes("/../")) {
    return false;
  }
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/")) {
    return false;
  }
  return true;
}

function collectImportSpecifiers(text: string): string[] {
  const specs = new Set<string>();
  const importRegex = /(?:import|export)\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of text.matchAll(importRegex)) {
    const spec = match[1] ?? match[2];
    if (spec) {
      specs.add(spec);
    }
  }
  return [...specs];
}

async function resolveRelativeImport(root: string, fileRef: string, specifier: string): Promise<string | null> {
  const from = join(root, fileRef);
  const base = join(dirname(from), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    join(base, "index.js"),
    join(base, "index.jsx")
  ];
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function loadPackageNames(root: string): Promise<Set<string>> {
  try {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const set = new Set<string>();
    for (const source of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
      if (!source) {
        continue;
      }
      for (const name of Object.keys(source)) {
        set.add(name);
      }
    }
    return set;
  } catch {
    return new Set<string>();
  }
}

function normalizePackageName(specifier: string): string {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/").slice(0, 2);
    return scope && name ? `${scope}/${name}` : specifier;
  }
  return specifier.split("/")[0];
}
