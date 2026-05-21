import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDoctor } from "../src/core/doctor.js";
import { saveProjectMemory, scanProject } from "../src/core/memory.js";

test("doctor reports node, package, scripts, and cache checks", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-doctor-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }));
  await saveProjectMemory(root, await scanProject(root));

  const report = await runDoctor(root);

  assert.equal(report.ok, true);
  assert.equal(report.checks.some((check) => check.name === "node" && check.ok), true);
  assert.equal(report.checks.some((check) => check.name === "package.json" && check.ok), true);
  assert.equal(report.checks.some((check) => check.name === "test script" && check.ok), true);
  assert.equal(report.checks.some((check) => check.name === "project memory" && check.ok), true);

  await rm(root, { recursive: true, force: true });
});

test("doctor marks missing package and cache as warnings", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-doctor-empty-"));

  const report = await runDoctor(root);

  assert.equal(report.ok, false);
  assert.equal(report.checks.some((check) => check.name === "package.json" && !check.ok), true);
  assert.equal(report.checks.some((check) => check.name === "project memory" && !check.ok), true);

  await rm(root, { recursive: true, force: true });
});
