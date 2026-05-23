import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sanitizeOutput } from "../src/core/sanitize.js";
import { sanitizeValidateWithRetry } from "../src/core/retry-loop.js";
import { validateOutput } from "../src/core/validate.js";

test("sanitize extracts fenced diff and strips explanation prose", async () => {
  const result = await sanitizeOutput(
    "Here is the fix\n```diff\n--- a/src/auth.ts\n+++ b/src/auth.ts\n+ const x = 1\n```",
    ["diff-only", "no-explanations"]
  );

  assert.match(result.cleanedOutput, /\[OUTPUT:/);
  assert.match(result.cleanedOutput, /```diff/);
  assert.doesNotMatch(result.cleanedOutput, /Here is the fix/);
});

test("validate flags exact-line-refs violations when required", async () => {
  const result = await validateOutput(
    "diff --git a/src/auth.ts b/src/auth.ts\n+ const x = 1",
    { projectRoot: process.cwd(), constraints: ["exact-line-refs"] }
  );

  assert.equal(result.valid, false);
  assert.equal(result.violations.includes("exact-line-refs-violation"), true);
});

test("validate rejects path traversal file refs", async () => {
  const result = await validateOutput(
    "diff --git a/../../secret.ts b/../../secret.ts\n+ const leak = 1",
    { projectRoot: process.cwd(), constraints: ["diff-only"] }
  );

  assert.equal(result.valid, false);
  assert.equal(result.violations.some((v) => v.startsWith("invalid-file-ref:")), true);
});

test("validate flags unknown package imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-validate-import-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "tmp", private: true, dependencies: { react: "1.0.0" } }));
  await writeFile(join(root, "src.ts"), "export {};\n");

  const result = await validateOutput(
    "diff --git a/src.ts b/src.ts\n@@ -1,1 +1,2 @@\n+import x from 'totally-not-real-package'\n+export {};",
    { projectRoot: root, constraints: ["diff-only"] }
  );

  assert.equal(result.valid, false);
  assert.equal(result.violations.includes("unknown-import:totally-not-real-package"), true);
  await rm(root, { recursive: true, force: true });
});

test("validate parses python/go/rust/csharp style imports and flags unknown ones", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-validate-multi-import-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "tmp", private: true, dependencies: {} }));
  await writeFile(join(root, "src.ts"), "export {};\n");

  const diff = [
    "diff --git a/src.ts b/src.ts",
    "@@ -1,1 +1,8 @@",
    "+import imaginary_pkg",
    "+from totally_fake.lib import x",
    "+import \"not/a/real/go/pkg\"",
    "+use fakecrate::module::Thing;",
    "+using Fake.Company.Product;",
    "+import os",
    "+use std::fmt;"
  ].join("\n");
  const result = await validateOutput(diff, { projectRoot: root, constraints: ["diff-only"] });

  assert.equal(result.valid, false);
  assert.equal(result.violations.includes("unknown-import:imaginary_pkg"), true);
  assert.equal(result.violations.includes("unknown-import:totally_fake.lib"), true);
  assert.equal(result.violations.includes("unknown-import:not/a/real/go/pkg"), true);
  assert.equal(result.violations.includes("unknown-import:fakecrate"), true);
  assert.equal(result.violations.includes("unknown-import:Fake.Company.Product"), true);
  assert.equal(result.violations.includes("unknown-import:os"), false);
  assert.equal(result.violations.includes("unknown-import:std"), false);
  await rm(root, { recursive: true, force: true });
});

test("retry loop emits deterministic canonical warning output", async () => {
  const result = await sanitizeValidateWithRetry(
    "prose only output",
    ["diff-only", "no-explanations", "exact-line-refs"],
    process.cwd()
  );

  assert.equal(result.valid, false);
  assert.equal(result.warning, "constraint-violation");
  assert.match(result.cleanedOutput, /⚠️ constraint-violation/);
});
