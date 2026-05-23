import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ContextKey, PolicyMode, TargetProfile } from "../types.js";
import { normalizePolicy } from "./policy.js";
import { isTargetProfile } from "./profiles.js";

const CONFIG_DIR = ".vibex";
const CONFIG_FILE = "config.json";

export interface RepoConfig {
  version: 1;
  policy?: PolicyMode;
  target?: TargetProfile;
  include?: ContextKey[];
  exclude?: ContextKey[];
  teamPreset?: string;
  inheritTeam: boolean;
}

export function repoConfigPath(root: string): string {
  return join(root, CONFIG_DIR, CONFIG_FILE);
}

export async function loadRepoConfig(root: string): Promise<RepoConfig> {
  try {
    const raw = JSON.parse(await readFile(repoConfigPath(root), "utf8")) as Partial<RepoConfig>;
    return {
      version: 1,
      policy: raw.policy === undefined ? undefined : normalizePolicy(raw.policy),
      target: normalizeTarget(raw.target),
      include: normalizeContextKeys(raw.include),
      exclude: normalizeContextKeys(raw.exclude),
      teamPreset: typeof raw.teamPreset === "string" && raw.teamPreset.trim() ? raw.teamPreset.trim() : undefined,
      inheritTeam: raw.inheritTeam ?? true
    };
  } catch {
    return {
      version: 1,
      inheritTeam: true
    };
  }
}

export async function saveRepoConfig(root: string, config: RepoConfig): Promise<void> {
  await mkdir(join(root, CONFIG_DIR), { recursive: true });
  await writeFile(repoConfigPath(root), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function normalizeTarget(value: unknown): TargetProfile | undefined {
  if (typeof value === "string" && isTargetProfile(value)) {
    return value;
  }
  return undefined;
}

function normalizeContextKeys(value: unknown): ContextKey[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const allowed: ContextKey[] = ["stack", "file", "diff", "error", "neighbors"];
  const filtered = value.filter((item): item is ContextKey => typeof item === "string" && allowed.includes(item as ContextKey));
  return filtered.length > 0 ? filtered : undefined;
}
