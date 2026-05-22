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
  assert.equal(memory.framework, "vite-react");
  assert.deepEqual(memory.stack.sort(), ["react", "vite", "vitest"]);
  assert.equal(memory.scripts.test, "vitest");
  assert.equal(memory.likelyTestCommand, "npm test");

  await rm(root, { recursive: true, force: true });
});

test("detects package manager from lockfile and tsconfig aliases", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-memory-lock-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: { next: "15.0.0", react: "19.0.0" },
      scripts: { test: "vitest" }
    })
  );
  await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@/*": ["src/*"],
          "@lib/*": ["lib/*"]
        }
      }
    })
  );
  await writeFile(join(root, "src.placeholder"), "");
  await writeFile(join(root, "tests.placeholder"), "");

  const memory = await scanProject(root);

  assert.equal(memory.packageManager, "pnpm");
  assert.equal(memory.framework, "nextjs");
  assert.equal(memory.likelyTestCommand, "pnpm test");
  assert.deepEqual(memory.aliases["@"], ["src"]);
  assert.deepEqual(memory.aliases["@lib"], ["lib"]);

  await rm(root, { recursive: true, force: true });
});

test("detects workspace roots in pnpm monorepo fixture", async () => {
  const root = join(process.cwd(), "tests", "fixtures", "pnpm-monorepo-basic");
  const memory = await scanProject(root);

  assert.equal(memory.workspaceRoots.includes("packages/app"), true);
  assert.equal(memory.packageRoot, ".");
});

test("scans package-specific memory in monorepo", async () => {
  const root = join(process.cwd(), "tests", "fixtures", "pnpm-monorepo-basic");
  const memory = await scanProject(root, "packages/app");

  assert.equal(memory.packageRoot, "packages/app");
  assert.equal(memory.frameworkFiles.includes("package.json"), true);
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
