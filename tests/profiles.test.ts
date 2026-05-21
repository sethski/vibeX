import test from "node:test";
import assert from "node:assert/strict";
import { applyTargetProfile } from "../src/core/profiles.js";

test("codex profile keeps concise default prompt", () => {
  const prompt = applyTargetProfile("Fix auth | Stack: node", "codex");

  assert.equal(prompt, "Fix auth | Stack: node");
});

test("claude profile does not add extra wrapper tokens", () => {
  const prompt = applyTargetProfile("Fix auth | Stack: node", "claude");

  assert.equal(prompt, "Fix auth | Stack: node");
});

test("cursor profile does not add extra wrapper tokens", () => {
  const prompt = applyTargetProfile("Fix auth | Stack: node", "cursor");

  assert.equal(prompt, "Fix auth | Stack: node");
});

test("rejects unsupported target profile", () => {
  assert.throws(() => applyTargetProfile("Fix auth", "unknown"), /Unsupported target/);
});
