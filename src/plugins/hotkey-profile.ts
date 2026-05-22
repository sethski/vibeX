import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ContextKey, ProjectContext, TargetProfile } from "../types.js";

const PROFILE_DIR = ".vibex";
const PROFILE_FILE = "hotkey.json";

export interface HotkeyProfile {
  version: 1;
  target: TargetProfile;
  include?: ContextKey[];
  exclude?: ContextKey[];
  context?: Partial<ProjectContext>;
}

export function hotkeyProfilePath(root: string): string {
  return join(root, PROFILE_DIR, PROFILE_FILE);
}

export async function loadHotkeyProfile(root: string): Promise<HotkeyProfile | null> {
  try {
    const raw = JSON.parse(await readFile(hotkeyProfilePath(root), "utf8")) as Partial<HotkeyProfile>;
    return normalizeHotkeyProfile(raw);
  } catch {
    return null;
  }
}

export async function saveHotkeyProfile(root: string, profile: HotkeyProfile): Promise<void> {
  await mkdir(join(root, PROFILE_DIR), { recursive: true });
  await writeFile(hotkeyProfilePath(root), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
}

export async function clearHotkeyProfile(root: string): Promise<void> {
  await rm(hotkeyProfilePath(root), { force: true });
}

function normalizeHotkeyProfile(raw: Partial<HotkeyProfile>): HotkeyProfile {
  return {
    version: 1,
    target: raw.target ?? "codex",
    include: raw.include,
    exclude: raw.exclude,
    context: raw.context ?? {}
  };
}
