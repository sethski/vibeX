import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { scanProject } from "../src/core/memory.js";
import { grabContext } from "../src/core/context-grabber.js";

const FIXTURES = join(process.cwd(), "tests", "fixtures");

test("fixture: nextjs project scan", async () => {
  const root = join(FIXTURES, "nextjs-basic");
  const memory = await scanProject(root);

  assert.equal(memory.framework, "nextjs");
  assert.equal(memory.packageManager, "npm");
  assert.equal(memory.sourceRoots.includes("src"), true);
  assert.deepEqual(memory.aliases["@"], ["src"]);
});

test("fixture: vite react project scan", async () => {
  const root = join(FIXTURES, "vite-react-basic");
  const memory = await scanProject(root);

  assert.equal(memory.framework, "vite-react");
  assert.equal(memory.packageManager, "npm");
  assert.equal(memory.sourceRoots.includes("src"), true);
});

test("fixture: pnpm monorepo scan", async () => {
  const root = join(FIXTURES, "pnpm-monorepo-basic");
  const memory = await scanProject(root);

  assert.equal(memory.packageManager, "pnpm");
  assert.equal(memory.framework, "typescript");
  assert.equal(memory.workspaceRoots.includes("packages/app"), true);
});

test("fixture: context import neighbors from active file", async () => {
  const root = join(FIXTURES, "nextjs-basic");
  const context = await grabContext({ root, activeFile: "src/auth/index.ts" });

  assert.deepEqual(context.importNeighbors.sort(), ["src/auth/session.ts", "src/lib/guards.ts"]);
});

test("fixture: context detects package root in monorepo", async () => {
  const root = join(FIXTURES, "pnpm-monorepo-basic");
  const context = await grabContext({ root, activeFile: "packages/app/package.json" });

  assert.equal(context.packageRoot, "packages/app");
  assert.equal(context.workspaceRoots?.includes("packages/app"), true);
});
