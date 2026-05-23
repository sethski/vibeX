import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveIntentTriple, findIntentTriple } from "../src/core/intent-cache.js";
import { routeModel } from "../src/core/model-router.js";
import { buildStateAnchor, formatStateAnchor } from "../src/core/state-anchor.js";
import { toStpPrompt } from "../src/core/stp.js";

test("toStpPrompt encodes core STP symbols", () => {
  const stp = toStpPrompt("fix weird auth redirect", {
    root: "/repo",
    stack: ["node"],
    framework: "nextjs",
    activeFile: "src/auth.ts",
    cursorLine: 42,
    gitSummary: "",
    recentErrors: ["TypeError: session undefined"],
    importNeighbors: []
  });

  assert.match(stp, /^→ /);
  assert.match(stp, /@src\/auth\.ts:42/);
  assert.match(stp, /# Next14/);
  assert.match(stp, /! TypeError/);
  assert.match(stp, /✓/);
});

test("state anchor stays three lines", () => {
  const anchor = buildStateAnchor("fix auth redirect", "Fix auth | File: src/auth.ts | Error: bad");
  const text = formatStateAnchor(anchor);
  const lines = text.split(/\r?\n/);
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^\[GOAL\]/);
  assert.match(lines[1], /^\[DONE\]/);
  assert.match(lines[2], /^\[NEXT\]/);
});

test("model router injects haiku only for claude", async () => {
  const claude = await routeModel("fix auth", "claude");
  const cursor = await routeModel("fix auth", "cursor");
  assert.equal(claude.modelFlag, "--model haiku");
  assert.equal(cursor.modelFlag, null);
});

test("intent cache stores and resolves sha lookup", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-intent-cache-"));
  await saveIntentTriple("fix auth", "→ fix @src/auth.ts", "diff --git a/src/auth.ts", root);
  const found = await findIntentTriple("fix auth", root);
  assert.equal(found?.stpPrompt, "→ fix @src/auth.ts");
  await rm(root, { recursive: true, force: true });
});
