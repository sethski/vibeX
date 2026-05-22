import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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
  return memoryPathForPackage(root, ".");
}

export function memoryPathForPackage(root: string, packageRoot: string): string {
  if (packageRoot === ".") {
    return join(root, CACHE_DIR, CACHE_FILE);
  }
  const slug = packageRoot.replace(/[\\/]+/g, "__").replace(/[^a-zA-Z0-9_.-]/g, "_");
  return join(root, CACHE_DIR, `cache.${slug}.json`);
}

export async function scanProject(root: string, packageRoot = "."): Promise<ProjectMemory> {
  const packagePath = packageRoot === "." ? root : join(root, packageRoot);
  const packageJson = await readPackageJson(packagePath);
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
  const sourceRoots = await existingDirectories(packagePath, ["src", "app", "pages", "core", "bridge", "lib"]);
  const testRoots = await existingDirectories(packagePath, ["test", "tests", "__tests__", "spec"]);
  const frameworkFiles = await existingFiles(packagePath, ["package.json", "tsconfig.json", "vite.config.ts", "next.config.js", "svelte.config.js"]);
  const scripts = normalizeScripts(packageJson.scripts);
  const aliases = await parseAliases(packagePath);
  const framework = detectFramework(allDeps, frameworkFiles);
  const workspaceRoots = await detectWorkspaceRoots(root);

  return {
    version: 1,
    root,
    packageRoot,
    scannedAt: new Date().toISOString(),
    stack: [...stack].sort(),
    packageManager,
    framework,
    scripts,
    likelyTestCommand: inferTestCommand(scripts, packageManager),
    sourceRoots,
    testRoots,
    workspaceRoots,
    aliases,
    frameworkFiles
  };
}

export async function loadProjectMemory(root: string, packageRoot = "."): Promise<ProjectMemory | null> {
  try {
    return normalizeLoadedMemory(
      root,
      JSON.parse(await readFile(memoryPathForPackage(root, packageRoot), "utf8")) as Partial<ProjectMemory>
    );
  } catch {
    if (packageRoot !== ".") {
      return loadProjectMemory(root, ".");
    }
    return null;
  }
}

export async function saveProjectMemory(root: string, memory: ProjectMemory): Promise<void> {
  await mkdir(join(root, CACHE_DIR), { recursive: true });
  await writeFile(memoryPathForPackage(root, memory.packageRoot), `${JSON.stringify(memory, null, 2)}\n`, "utf8");
}

export async function clearProjectMemory(root: string): Promise<void> {
  try {
    const dir = join(root, CACHE_DIR);
    const files = await readdir(dir);
    await Promise.all(
      files
        .filter((name) => /^cache(?:\.[^.]+)?\.json$/.test(name))
        .map((name) => rm(join(dir, name), { force: true }))
    );
  } catch {
    // Missing cache directory is normal.
  }
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

async function detectWorkspaceRoots(root: string): Promise<string[]> {
  const patterns = [
    ...(await readPnpmWorkspacePatterns(root)),
    ...(await readPackageJsonWorkspacePatterns(root))
  ];
  if (patterns.length === 0) {
    return [];
  }

  const roots = new Set<string>();
  for (const pattern of patterns) {
    for (const candidate of await expandWorkspacePattern(root, pattern)) {
      roots.add(candidate);
    }
  }

  return [...roots].sort();
}

async function readPnpmWorkspacePatterns(root: string): Promise<string[]> {
  try {
    const yaml = await readFile(join(root, "pnpm-workspace.yaml"), "utf8");
    return yaml
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-+\s*/, "").replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function readPackageJsonWorkspacePatterns(root: string): Promise<string[]> {
  const packageJson = await readPackageJson(root);
  const workspaces = packageJson.workspaces;
  if (Array.isArray(workspaces)) {
    return workspaces.filter((value): value is string => typeof value === "string");
  }
  if (workspaces && typeof workspaces === "object") {
    const packages = (workspaces as { packages?: unknown }).packages;
    if (Array.isArray(packages)) {
      return packages.filter((value): value is string => typeof value === "string");
    }
  }
  return [];
}

async function expandWorkspacePattern(root: string, pattern: string): Promise<string[]> {
  const normalized = pattern.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (!normalized) {
    return [];
  }

  if (!normalized.includes("*")) {
    return (await isWorkspacePackage(root, normalized)) ? [normalized] : [];
  }

  if (normalized.endsWith("/*")) {
    const base = normalized.slice(0, -2);
    const basePath = join(root, base);
    try {
      const entries = await readdir(basePath, { withFileTypes: true });
      const dirs = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => `${base}/${entry.name}`.replace(/\\/g, "/"));
      const accepted: string[] = [];
      for (const dir of dirs) {
        if (await isWorkspacePackage(root, dir)) {
          accepted.push(dir);
        }
      }
      return accepted;
    } catch {
      return [];
    }
  }

  return [];
}

async function isWorkspacePackage(root: string, relativePath: string): Promise<boolean> {
  try {
    const file = await stat(join(root, relativePath, "package.json"));
    return file.isFile();
  } catch {
    return false;
  }
}

function normalizeLoadedMemory(root: string, raw: Partial<ProjectMemory>): ProjectMemory {
  return {
    version: 1,
    root,
    packageRoot: raw.packageRoot ?? ".",
    scannedAt: raw.scannedAt ?? new Date(0).toISOString(),
    stack: raw.stack ?? [],
    packageManager: raw.packageManager,
    framework: raw.framework ?? "node",
    scripts: raw.scripts ?? {},
    likelyTestCommand: raw.likelyTestCommand,
    sourceRoots: raw.sourceRoots ?? [],
    testRoots: raw.testRoots ?? [],
    workspaceRoots: raw.workspaceRoots ?? [],
    aliases: raw.aliases ?? {},
    frameworkFiles: raw.frameworkFiles ?? []
  };
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
