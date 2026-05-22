import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PolicyMode } from "../types.js";
import { normalizePolicy } from "./policy.js";

const CONFIG_DIR = ".vibex";
const CONFIG_FILE = "config.json";

export interface RepoConfig {
  version: 1;
  policy: PolicyMode;
}

export function repoConfigPath(root: string): string {
  return join(root, CONFIG_DIR, CONFIG_FILE);
}

export async function loadRepoConfig(root: string): Promise<RepoConfig> {
  try {
    const raw = JSON.parse(await readFile(repoConfigPath(root), "utf8")) as Partial<RepoConfig>;
    return {
      version: 1,
      policy: normalizePolicy(raw.policy)
    };
  } catch {
    return {
      version: 1,
      policy: "balanced"
    };
  }
}

export async function saveRepoConfig(root: string, config: RepoConfig): Promise<void> {
  await mkdir(join(root, CONFIG_DIR), { recursive: true });
  await writeFile(repoConfigPath(root), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
