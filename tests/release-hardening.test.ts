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
