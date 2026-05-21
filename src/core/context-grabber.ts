import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import type { ContextGrabberOptions, ProjectContext } from "../types.js";
import { loadProjectMemory, scanProject } from "./memory.js";

const execFileAsync = promisify(execFile);

export async function grabContext(options: ContextGrabberOptions = {}): Promise<ProjectContext> {
  const root = options.root ?? process.cwd();
  const memory = (await loadProjectMemory(root)) ?? (await scanProject(root));

  return {
    root,
    stack: memory.stack,
    activeFile: options.activeFile,
    cursorLine: options.cursorLine,
    gitSummary: await gitSummary(root),
    recentErrors: await recentErrors(root),
    importNeighbors: []
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
