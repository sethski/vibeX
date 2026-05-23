import test from "node:test";
import assert from "node:assert/strict";
import { createPreview } from "../src/core/preview.js";
import { scoreOptimization } from "../src/core/quality.js";

const context = {
  root: "/repo",
  stack: ["node", "typescript"],
  activeFile: "src/auth.ts",
  cursorLine: 20,
  gitSummary: "src/auth.ts (+8)",
  recentErrors: ["TypeError: bad session"],
  importNeighbors: ["src/session.ts"]
};

test("scoreOptimization returns normalized score and grade", () => {
  const preview = createPreview("fix auth redirect issue", context, { explain: true, policy: "strict" });
  const quality = scoreOptimization("fix auth redirect issue", preview);

  assert.equal(typeof quality.score, "number");
  assert.equal(quality.score >= 0 && quality.score <= 1, true);
  assert.match(quality.grade, /^[ABCDF]$/);
  assert.equal(typeof quality.components.tokenEfficiency, "number");
});

test("scoreOptimization privacy component ignores secrets in metadata", () => {
  const preview = createPreview("fix auth SECRET_TOKEN=abc123xyz", context, { explain: true, policy: "balanced" });
  const quality = scoreOptimization("fix auth SECRET_TOKEN=abc123xyz", preview);

  assert.equal(quality.components.privacy, 1);
});
