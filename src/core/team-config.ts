import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CompressionOptions, ContextKey, PolicyMode, TargetProfile } from "../types.js";
import { normalizePolicy } from "./policy.js";
import { isTargetProfile } from "./profiles.js";

const CONFIG_DIR = ".vibex";
const TEAM_FILE = "team.json";

export interface TeamOptions {
  target?: TargetProfile;
  policy?: PolicyMode;
  include?: ContextKey[];
  exclude?: ContextKey[];
}

export interface TeamConfig {
  version: 1;
  org?: string;
  defaults: TeamOptions;
  presets: Record<string, TeamOptions>;
}

export function teamConfigPath(root: string): string {
  return join(root, CONFIG_DIR, TEAM_FILE);
}

export async function loadTeamConfig(root: string): Promise<TeamConfig> {
  try {
    const raw = JSON.parse(await readFile(teamConfigPath(root), "utf8")) as Partial<TeamConfig>;
    return normalizeTeamConfig(raw);
  } catch {
    return {
      version: 1,
      defaults: {},
      presets: {}
    };
  }
}

export async function saveTeamConfig(root: string, config: TeamConfig): Promise<void> {
  await mkdir(join(root, CONFIG_DIR), { recursive: true });
  await writeFile(teamConfigPath(root), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function normalizeTeamConfig(raw: Partial<TeamConfig>): TeamConfig {
  const presets: Record<string, TeamOptions> = {};
  if (raw.presets && typeof raw.presets === "object") {
    for (const [name, options] of Object.entries(raw.presets)) {
      if (name.trim() && options && typeof options === "object") {
        presets[name.trim()] = normalizeTeamOptions(options as Partial<CompressionOptions>);
      }
    }
  }

  return {
    version: 1,
    org: typeof raw.org === "string" && raw.org.trim() ? raw.org.trim() : undefined,
    defaults: normalizeTeamOptions(raw.defaults as Partial<CompressionOptions> | undefined),
    presets
  };
}

export function normalizeTeamOptions(raw?: Partial<CompressionOptions>): TeamOptions {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return {
    target: normalizeTarget(raw.target),
    policy: raw.policy === undefined ? undefined : normalizePolicy(raw.policy),
    include: normalizeContextKeys(raw.include),
    exclude: normalizeContextKeys(raw.exclude)
  };
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
