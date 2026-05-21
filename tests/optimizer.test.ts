import test from "node:test";
import assert from "node:assert/strict";
import { optimizePrompt } from "../src/core/formatter.js";

test("optimizes with provided context", async () => {
  const optimized = await optimizePrompt("fix auth", {
    root: "/repo",
    stack: ["node"],
    activeFile: "src/auth.ts",
    gitSummary: "",
    recentErrors: [],
    importNeighbors: []
  });

  assert.match(optimized, /Fix auth/);
  assert.match(optimized, /Stack: node/);
});

test("rejects empty prompts", async () => {
  await assert.rejects(() => optimizePrompt("   "), /Prompt is required/);
});
