import test from "node:test";
import assert from "node:assert/strict";
import { compressPrompt } from "../src/core/compressor.js";

test("strips filler and injects stack and active file", () => {
  const result = compressPrompt("hey can you please fix the weird redirect thing", {
    root: "/repo",
    stack: ["next", "typescript"],
    activeFile: "src/auth/hooks.ts",
    cursorLine: 42,
    gitSummary: "",
    recentErrors: [],
    importNeighbors: []
  });

  assert.match(result.optimized, /^Fix weird redirect thing/);
  assert.match(result.optimized, /Stack: next typescript/);
  assert.match(result.optimized, /File: src\/auth\/hooks.ts:42/);
  assert.match(result.optimized, /Preserve existing style\/tests/);
  assert.equal(result.optimized.includes("please"), false);
});

test("includes terminal errors only for debug-like prompts", () => {
  const context = {
    root: "/repo",
    stack: ["node"],
    activeFile: "src/index.ts",
    gitSummary: "",
    recentErrors: ["TypeError: bad redirect"],
    importNeighbors: []
  };

  assert.match(compressPrompt("debug redirect crash", context).optimized, /Error: TypeError: bad redirect/);
  assert.doesNotMatch(compressPrompt("add redirect helper", context).optimized, /TypeError/);
});

test("keeps prompt within default token budget", () => {
  const result = compressPrompt(
    "please improve the very confusing authentication redirect behavior",
    {
      root: "/repo",
      stack: ["next", "typescript", "react"],
      activeFile: "src/auth/hooks.ts",
      gitSummary: "100 files changed with many low signal details",
      recentErrors: ["Long error ".repeat(30)],
      importNeighbors: ["src/auth/client.ts", "src/auth/session.ts"]
    }
  );

  assert.equal(result.tokenEstimate <= 120, true);
});

test("minimal policy suppresses diff and neighbors", () => {
  const result = compressPrompt(
    "fix auth redirect",
    {
      root: "/repo",
      stack: ["next"],
      activeFile: "src/auth.ts",
      gitSummary: "src/auth.ts (+12) | 1 file changed",
      recentErrors: ["TypeError: redirect"],
      importNeighbors: ["src/a.ts", "src/b.ts"]
    },
    { policy: "minimal" }
  );

  assert.doesNotMatch(result.optimized, /Diff:/);
  assert.doesNotMatch(result.optimized, /Neighbors:/);
});

test("strict policy includes diff and error context", () => {
  const result = compressPrompt(
    "refactor auth module",
    {
      root: "/repo",
      stack: ["next"],
      activeFile: "src/auth.ts",
      gitSummary: "src/auth.ts (+12) | 1 file changed",
      recentErrors: ["TypeError: redirect"],
      importNeighbors: []
    },
    { policy: "strict" }
  );

  assert.match(result.optimized, /Diff:/);
  assert.match(result.optimized, /Error:/);
  assert.match(result.optimized, /deterministic/i);
});
