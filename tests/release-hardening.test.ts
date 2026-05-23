import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("stable contract and migration docs exist", async () => {
  const root = process.cwd();
  const contracts = await readFile(join(root, "CONTRACTS.md"), "utf8");
  const migrations = await readFile(join(root, "MIGRATIONS.md"), "utf8");

  assert.match(contracts, /Stable Contracts/i);
  assert.match(contracts, /POST \/optimize/);
  assert.match(migrations, /Migration Notes/i);
});

test("benchmark baseline artifact is present and valid", async () => {
  const root = process.cwd();
  const baseline = JSON.parse(await readFile(join(root, "benchmarks", "context-baseline.json"), "utf8")) as {
    iterations: number;
    scan: { avgMs: number };
    context: { avgMs: number };
  };

  assert.equal(typeof baseline.iterations, "number");
  assert.equal(typeof baseline.scan.avgMs, "number");
  assert.equal(typeof baseline.context.avgMs, "number");
  assert.equal(baseline.iterations > 0, true);
});

test("optimization snapshot artifact is present and valid", async () => {
  const root = process.cwd();
  const snapshots = JSON.parse(await readFile(join(root, "benchmarks", "optimization-snapshots.json"), "utf8")) as {
    version: number;
    scenarios: Array<{ id: string; expect: { optimizedHash: string } }>;
  };

  assert.equal(snapshots.version, 1);
  assert.equal(Array.isArray(snapshots.scenarios), true);
  assert.equal(snapshots.scenarios.length > 0, true);
  for (const scenario of snapshots.scenarios) {
    assert.equal(typeof scenario.id, "string");
    assert.equal(typeof scenario.expect.optimizedHash, "string");
  }
});

test("spec2 config and python metadata artifacts are present", async () => {
  const root = process.cwd();
  const defaults = JSON.parse(await readFile(join(root, "config", "defaults.json"), "utf8")) as {
    retryLimits: { maxAttempts: number };
  };
  const rules = JSON.parse(await readFile(join(root, "config", "rules.json"), "utf8")) as {
    outputRules: { requiredTag: string };
  };
  const models = JSON.parse(await readFile(join(root, "config", "models.json"), "utf8")) as {
    claude: { modelFlag: string | null };
  };
  const pyproject = await readFile(join(root, "pyproject.toml"), "utf8");

  assert.equal(typeof defaults.retryLimits.maxAttempts, "number");
  assert.equal(typeof rules.outputRules.requiredTag, "string");
  assert.equal(Object.hasOwn(models, "claude"), true);
  assert.match(pyproject, /\[project\]/);
});
