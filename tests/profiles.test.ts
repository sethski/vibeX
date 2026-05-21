import test from "node:test";
import assert from "node:assert/strict";
import { applyTargetProfile } from "../src/core/profiles.js";

test("codex profile keeps concise default prompt", () => {
  const prompt = applyTargetProfile("Fix auth | Stack: node", "codex");

  assert.equal(prompt, "Fix auth | Stack: node");
});

test("claude profile asks for brief plan then patch", () => {
  const prompt = applyTargetProfile("Fix auth | Stack: node", "claude");

  assert.match(prompt, /^Think briefly, then edit\./);
  assert.match(prompt, /Fix auth/);
});

test("cursor profile includes file-focused instruction", () => {
  const prompt = applyTargetProfile("Fix auth | Stack: node", "cursor");

  assert.match(prompt, /Use open files and current selection first\./);
});

test("rejects unsupported target profile", () => {
  assert.throws(() => applyTargetProfile("Fix auth", "unknown"), /Unsupported target/);
});
