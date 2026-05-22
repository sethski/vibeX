import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectMemory } from "../types.js";

const CACHE_DIR = ".vibex";
const CACHE_FILE = "cache.json";
const KNOWN_STACK: Record<string, string[]> = {
  "@angular/core": ["angular"],
  "@sveltejs/kit": ["sveltekit"],
  "next": ["next", "react"],
  "react": ["react"],
  "typescript": ["typescript"],
  "vite": ["vite"],
  "vitest": ["vitest"],
  "vue": ["vue"]
};

export function memoryPath(root: string): string {
  return join(root, CACHE_DIR, CACHE_FILE);
}

export async function scanProject(root: string): Promise<ProjectMemory> {
  const packageJson = await readPackageJson(root);
  const allDeps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {})
  };
  const stack = new Set<string>();

  for (const dep of Object.keys(allDeps)) {
    for (const name of KNOWN_STACK[dep] ?? []) {
      stack.add(name);
    }
  }

  const packageManager = await detectPackageManager(root, packageJson.packageManager);
  const sourceRoots = await existingDirectories(root, ["src", "app", "pages", "core", "bridge", "lib"]);
  const testRoots = await existingDirectories(root, ["test", "tests", "__tests__", "spec"]);
  const frameworkFiles = await existingFiles(root, ["package.json", "tsconfig.json", "vite.config.ts", "next.config.js", "svelte.config.js"]);
  const scripts = normalizeScripts(packageJson.scripts);
  const aliases = await parseAliases(root);
  const framework = detectFramework(allDeps, frameworkFiles);

  return {
    version: 1,
    root,
    scannedAt: new Date().toISOString(),
    stack: [...stack].sort(),
    packageManager,
    framework,
    scripts,
    likelyTestCommand: inferTestCommand(scripts, packageManager),
    sourceRoots,
    testRoots,
    aliases,
    frameworkFiles
  };
}

export async function loadProjectMemory(root: string): Promise<ProjectMemory | null> {
  try {
    return JSON.parse(await readFile(memoryPath(root), "utf8")) as ProjectMemory;
  } catch {
    return null;
  }
}

export async function saveProjectMemory(root: string, memory: ProjectMemory): Promise<void> {
  await mkdir(join(root, CACHE_DIR), { recursive: true });
  await writeFile(memoryPath(root), `${JSON.stringify(memory, null, 2)}\n`, "utf8");
}

export async function clearProjectMemory(root: string): Promise<void> {
  await rm(memoryPath(root), { force: true });
}

async function readPackageJson(root: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(join(root, "package.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeScripts(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const scripts: Record<string, string> = {};
  for (const [key, script] of Object.entries(value)) {
    if (typeof script === "string") {
      scripts[key] = script;
    }
  }
  return scripts;
}

function inferTestCommand(scripts: Record<string, string>, packageManager?: string): string | undefined {
  const manager = basePackageManager(packageManager);
  const run = manager === "pnpm" ? "pnpm" : manager === "yarn" ? "yarn" : manager === "bun" ? "bun" : "npm run";
  const test = manager === "pnpm" ? "pnpm test" : manager === "yarn" ? "yarn test" : manager === "bun" ? "bun test" : "npm test";

  if (scripts.test) {
    return test;
  }
  if (scripts["test:unit"]) {
    return `${run} test:unit`;
  }
  return undefined;
}

async function existingDirectories(root: string, names: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const name of names) {
    try {
      const file = await stat(join(root, name));
      if (file.isDirectory()) {
        found.push(name);
      }
    } catch {
      // Missing project markers are normal.
    }
  }
  return found;
}

async function existingFiles(root: string, names: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const name of names) {
    try {
      const file = await stat(join(root, name));
      if (file.isFile()) {
        found.push(name);
      }
    } catch {
      // Missing project markers are normal.
    }
  }
  return found;
}

async function detectPackageManager(root: string, packageManagerField: unknown): Promise<string | undefined> {
  if (typeof packageManagerField === "string" && packageManagerField.trim()) {
    return packageManagerField.trim();
  }
  if (await exists(root, "pnpm-lock.yaml")) {
    return "pnpm";
  }
  if (await exists(root, "yarn.lock")) {
    return "yarn";
  }
  if (await exists(root, "bun.lockb") || await exists(root, "bun.lock")) {
    return "bun";
  }
  if (await exists(root, "package-lock.json")) {
    return "npm";
  }
  return undefined;
}

function basePackageManager(manager?: string): "npm" | "pnpm" | "yarn" | "bun" {
  if (!manager) {
    return "npm";
  }
  if (manager.startsWith("pnpm")) {
    return "pnpm";
  }
  if (manager.startsWith("yarn")) {
    return "yarn";
  }
  if (manager.startsWith("bun")) {
    return "bun";
  }
  return "npm";
}

async function parseAliases(root: string): Promise<Record<string, string[]>> {
  try {
    const raw = JSON.parse(await readFile(join(root, "tsconfig.json"), "utf8")) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    const paths = raw.compilerOptions?.paths ?? {};
    const aliases: Record<string, string[]> = {};
    for (const [key, values] of Object.entries(paths)) {
      const cleanedKey = key.replace(/\/\*$/, "");
      aliases[cleanedKey] = values.map((value) => value.replace(/\/\*$/, ""));
    }
    return aliases;
  } catch {
    return {};
  }
}

function detectFramework(deps: Record<string, unknown>, files: string[]): string {
  const has = (name: string): boolean => Object.prototype.hasOwnProperty.call(deps, name);
  if (has("next")) {
    return "nextjs";
  }
  if (has("@sveltejs/kit")) {
    return "sveltekit";
  }
  if (has("vite") && has("react")) {
    return "vite-react";
  }
  if (has("vite") && has("vue")) {
    return "vite-vue";
  }
  if (has("vite")) {
    return "vite";
  }
  if (has("@angular/core")) {
    return "angular";
  }
  if (has("react")) {
    return "react";
  }
  if (has("vue")) {
    return "vue";
  }
  if (has("typescript") || files.includes("tsconfig.json")) {
    return "typescript";
  }
  return "node";
}

async function exists(root: string, file: string): Promise<boolean> {
  try {
    await stat(join(root, file));
    return true;
  } catch {
    return false;
  }
}
