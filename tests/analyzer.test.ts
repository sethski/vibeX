import test from "node:test";
import assert from "node:assert/strict";
import { analyzePrompt } from "../src/core/analyzer.js";

test("flags short vague prompts", () => {
  const result = analyzePrompt("fix auth");

  assert.equal(result.isVague, true);
  assert.equal(result.reasons.includes("short_prompt"), true);
  assert.equal(result.confidence > 0.5, true);
});

test("flags trigger words even when prompt is longer", () => {
  const result = analyzePrompt("please improve the dashboard spacing and make the charts better");

  assert.equal(result.isVague, true);
  assert.equal(result.reasons.includes("trigger_word"), true);
});

test("does not flag specific implementation requests", () => {
  const result = analyzePrompt("Add a required email validator in src/auth/schema.ts and cover empty input");

  assert.equal(result.isVague, false);
  assert.equal(result.confidence < 0.5, true);
});
