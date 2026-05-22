import test from "node:test";
import assert from "node:assert/strict";
import { createPreview } from "../src/core/preview.js";

const context = {
  root: "/repo",
  stack: ["node", "typescript"],
  activeFile: "src/auth.ts",
  cursorLine: 12,
  gitSummary: "src/auth.ts | 8 ++--",
  recentErrors: ["TypeError: bad session"],
  importNeighbors: ["src/session.ts"]
};

test("preview returns optimized prompt with context details", () => {
  const preview = createPreview("fix auth crash", context, { explain: true });

  assert.match(preview.optimized, /^Fix auth crash/);
  assert.equal(preview.context.length > 0, true);
  assert.equal(preview.context.some((item) => item.key === "stack" && item.included), true);
  assert.equal(preview.context.some((item) => item.key === "error" && item.reason.length > 0), true);
});

test("preview include filter limits context keys", () => {
  const preview = createPreview("fix auth crash", context, { include: ["stack", "file"] });

  assert.deepEqual(preview.context.filter((item) => item.included).map((item) => item.key), ["stack", "file"]);
  assert.match(preview.optimized, /Stack: node typescript/);
  assert.doesNotMatch(preview.optimized, /Error:/);
});

test("preview exclude filter removes noisy context", () => {
  const preview = createPreview("fix auth crash", context, { exclude: ["diff", "error"] });

  assert.equal(preview.context.find((item) => item.key === "diff")?.included, false);
  assert.equal(preview.context.find((item) => item.key === "error")?.included, false);
  assert.doesNotMatch(preview.optimized, /Diff:/);
  assert.doesNotMatch(preview.optimized, /Error:/);
});

test("preview does not include raw prompt in context details", () => {
  const preview = createPreview("fix auth SECRET_TOKEN=abc123", context, { explain: true });

  assert.equal(JSON.stringify(preview.context).includes("SECRET_TOKEN"), false);
});

test("preview context order follows ranking", () => {
  const preview = createPreview("fix auth crash", context, { explain: true });
  const keys = preview.context.map((item) => item.key);

  assert.deepEqual(keys, ["stack", "file", "error", "neighbors", "diff"]);
});

test("preview emits confidence scores for each context item", () => {
  const preview = createPreview("fix auth crash", context, { explain: true });

  for (const item of preview.context) {
    assert.equal(typeof item.confidence, "number");
    assert.equal(item.confidence >= 0 && item.confidence <= 1, true);
  }
});

test("low confidence context falls back to safe clarifying prompt", () => {
  const preview = createPreview("fix it", {
    root: "/repo",
    stack: [],
    gitSummary: "",
    recentErrors: [],
    importNeighbors: []
  }, { explain: true });

  assert.match(preview.optimized, /Clarify exact file\/component/);
});
