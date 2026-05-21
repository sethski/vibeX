import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearProjectMemory, loadProjectMemory, saveProjectMemory, scanProject } from "../src/core/memory.js";

test("scans package metadata into local project memory", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-memory-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      packageManager: "npm@10.0.0",
      dependencies: { react: "18.3.1", vite: "5.0.0" },
      devDependencies: { vitest: "2.0.0" },
      scripts: { test: "vitest", build: "vite build" }
    })
  );

  const memory = await scanProject(root);

  assert.equal(memory.packageManager, "npm@10.0.0");
  assert.deepEqual(memory.stack.sort(), ["react", "vite", "vitest"]);
  assert.equal(memory.scripts.test, "vitest");
  assert.equal(memory.likelyTestCommand, "npm test");

  await rm(root, { recursive: true, force: true });
});

test("stores only derived metadata in cache", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-cache-"));
  const memory = await scanProject(root);
  await saveProjectMemory(root, memory);

  const raw = await readFile(join(root, ".vibex", "cache.json"), "utf8");

  assert.equal(raw.includes("fix my secret prompt"), false);
  assert.equal(raw.includes("process.env"), false);
  assert.equal(raw.includes("fileContents"), false);

  await rm(root, { recursive: true, force: true });
});

test("loads and clears project memory", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-clear-"));
  await saveProjectMemory(root, await scanProject(root));

  assert.notEqual(await loadProjectMemory(root), null);

  await clearProjectMemory(root);

  assert.equal(await loadProjectMemory(root), null);
  await rm(root, { recursive: true, force: true });
});
