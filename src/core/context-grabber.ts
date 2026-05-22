import { readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, normalize } from "node:path";
import type { ContextGrabberOptions, ProjectContext } from "../types.js";
import { loadProjectMemory, scanProject } from "./memory.js";

const execFileAsync = promisify(execFile);
const IMPORT_RE = /(?:import|export)\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

export async function grabContext(options: ContextGrabberOptions = {}): Promise<ProjectContext> {
  const root = options.root ?? process.cwd();
  const memory = (await loadProjectMemory(root)) ?? (await scanProject(root));
  const importNeighbors = await findImportNeighbors(root, options.activeFile, memory.aliases);

  return {
    root,
    stack: memory.stack,
    packageManager: memory.packageManager,
    framework: memory.framework,
    sourceRoots: memory.sourceRoots,
    testRoots: memory.testRoots,
    aliases: memory.aliases,
    activeFile: options.activeFile,
    cursorLine: options.cursorLine,
    gitSummary: await gitSummary(root),
    recentErrors: await recentErrors(root),
    importNeighbors
  };
}

async function gitSummary(root: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--stat"], { cwd: root, timeout: 1500 });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function recentErrors(root: string): Promise<string[]> {
  try {
    const content = await readFile(join(root, ".vibex", "last-error.log"), "utf8");
    return content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(-3);
  } catch {
    return [];
  }
}

async function findImportNeighbors(
  root: string,
  activeFile: string | undefined,
  aliases: Record<string, string[]>
): Promise<string[]> {
  if (!activeFile) {
    return [];
  }

  const activePath = join(root, activeFile);
  let content: string;
  try {
    content = await readFile(activePath, "utf8");
  } catch {
    return [];
  }

  const matches = [...content.matchAll(IMPORT_RE)];
  const found = new Set<string>();
  for (const match of matches) {
    const importPath = match[1] ?? match[2];
    if (!importPath) {
      continue;
    }
    const resolved = await resolveImport(root, activePath, importPath, aliases);
    if (resolved) {
      found.add(toProjectPath(root, resolved));
    }
  }

  return [...found].sort().slice(0, 2);
}

async function resolveImport(
  root: string,
  activePath: string,
  importPath: string,
  aliases: Record<string, string[]>
): Promise<string | null> {
  if (importPath.startsWith(".")) {
    return resolveFileCandidates(join(dirname(activePath), importPath));
  }

  for (const [alias, targets] of Object.entries(aliases)) {
    if (importPath === alias || importPath.startsWith(`${alias}/`)) {
      const suffix = importPath.slice(alias.length).replace(/^\//, "");
      for (const target of targets) {
        const candidate = await resolveFileCandidates(join(root, target, suffix));
        if (candidate) {
          return candidate;
        }
      }
    }
  }

  return null;
}

async function resolveFileCandidates(basePath: string): Promise<string | null> {
  const candidates = [basePath, ...CODE_EXTENSIONS.map((ext) => `${basePath}${ext}`), ...CODE_EXTENSIONS.map((ext) => join(basePath, `index${ext}`))];
  for (const candidate of candidates) {
    try {
      const file = await stat(candidate);
      if (file.isFile()) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

function toProjectPath(root: string, absolutePath: string): string {
  const normalizedRoot = normalize(root);
  const normalizedPath = normalize(absolutePath);
  const relative = normalizedPath.startsWith(normalizedRoot) ? normalizedPath.slice(normalizedRoot.length + 1) : normalizedPath;
  return relative.replace(/\\/g, "/");
}
