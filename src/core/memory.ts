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

  const sourceRoots = await existingPaths(root, ["src", "app", "pages", "core", "bridge"]);
  const frameworkFiles = await existingPaths(root, ["package.json", "tsconfig.json", "vite.config.ts", "next.config.js"]);
  const scripts = normalizeScripts(packageJson.scripts);

  return {
    version: 1,
    root,
    scannedAt: new Date().toISOString(),
    stack: [...stack].sort(),
    packageManager: typeof packageJson.packageManager === "string" ? packageJson.packageManager : undefined,
    scripts,
    likelyTestCommand: inferTestCommand(scripts),
    sourceRoots,
    aliases: {},
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

function inferTestCommand(scripts: Record<string, string>): string | undefined {
  if (scripts.test) {
    return "npm test";
  }
  if (scripts["test:unit"]) {
    return "npm run test:unit";
  }
  return undefined;
}

async function existingPaths(root: string, names: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const name of names) {
    try {
      await stat(join(root, name));
      found.push(name);
    } catch {
      // Missing project markers are normal.
    }
  }
  return found;
}
