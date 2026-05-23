import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { loadDefaultsConfig } from "../config/spec2.js";

interface CacheEntry {
  key: string;
  rawPrompt: string;
  stpPrompt: string;
  aiOutput: string;
  updatedAt: string;
}

interface CacheDoc {
  version: 1;
  entries: CacheEntry[];
}

let writeChain = Promise.resolve();

export async function saveIntentTriple(
  rawPrompt: string,
  stpPrompt: string,
  aiOutput: string,
  root = process.cwd()
): Promise<void> {
  const defaults = await loadDefaultsConfig(root);
  const maxEntries = defaults.cacheLimits?.maxEntries ?? 500;
  const path = cachePath(root);
  const key = sha256(rawPrompt);

  writeChain = writeChain.then(async () => {
    const doc = await loadCacheDoc(path);
    const existingIndex = doc.entries.findIndex((entry) => entry.key === key);
    const entry: CacheEntry = { key, rawPrompt, stpPrompt, aiOutput, updatedAt: new Date().toISOString() };
    if (existingIndex >= 0) {
      doc.entries.splice(existingIndex, 1);
    }
    doc.entries.unshift(entry);
    doc.entries = doc.entries.slice(0, maxEntries);
    await persistCacheDoc(path, doc);
  });

  await writeChain;
}

export async function findIntentTriple(rawPrompt: string, root = process.cwd()): Promise<CacheEntry | null> {
  const path = cachePath(root);
  const doc = await loadCacheDoc(path);
  const key = sha256(rawPrompt);
  return doc.entries.find((entry) => entry.key === key) ?? null;
}

function cachePath(root: string): string {
  return join(root, ".vibex", "cache", "intents.json");
}

async function loadCacheDoc(path: string): Promise<CacheDoc> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as CacheDoc;
  } catch {
    return { version: 1, entries: [] };
  }
}

async function persistCacheDoc(path: string, doc: CacheDoc): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  await rename(temp, path);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
