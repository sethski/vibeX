import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface DefaultsConfig {
  maxTokens?: number;
  retryLimits?: { maxAttempts?: number };
  cacheLimits?: { maxEntries?: number };
  defaultConstraints?: string[];
}

interface RulesConfig {
  fillerWords?: string[];
  outputRules?: { requiredTag?: string };
}

interface ModelConfigEntry {
  modelFlag: string | null;
  hint: string | null;
}

type ModelsConfig = Record<string, ModelConfigEntry>;

let defaultsCache: DefaultsConfig | null = null;
let rulesCache: RulesConfig | null = null;
let modelsCache: ModelsConfig | null = null;

export async function loadDefaultsConfig(root = process.cwd()): Promise<DefaultsConfig> {
  if (defaultsCache) {
    return defaultsCache;
  }
  defaultsCache = await readJson<DefaultsConfig>(join(root, "config", "defaults.json"), {});
  return defaultsCache;
}

export async function loadRulesConfig(root = process.cwd()): Promise<RulesConfig> {
  if (rulesCache) {
    return rulesCache;
  }
  rulesCache = await readJson<RulesConfig>(join(root, "config", "rules.json"), {});
  return rulesCache;
}

export async function loadModelsConfig(root = process.cwd()): Promise<ModelsConfig> {
  if (modelsCache) {
    return modelsCache;
  }
  modelsCache = await readJson<ModelsConfig>(join(root, "config", "models.json"), {});
  return modelsCache;
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}
