import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveGovernedOptions } from "../src/core/governance.js";
import { saveRepoConfig } from "../src/core/repo-config.js";
import { saveTeamConfig } from "../src/core/team-config.js";

test("governance merge order is deterministic", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-governance-"));
  await saveTeamConfig(root, {
    version: 1,
    org: "acme",
    defaults: { target: "cursor", policy: "strict", include: ["stack"] },
    presets: {
      debug: { policy: "strict", include: ["stack", "error"], exclude: ["neighbors"] }
    }
  });
  await saveRepoConfig(root, {
    version: 1,
    policy: "balanced",
    target: "copilot",
    teamPreset: "debug",
    inheritTeam: true
  });

  const resolved = await resolveGovernedOptions(root, {
    target: "claude",
    policy: "minimal"
  });

  assert.equal(resolved.target, "claude");
  assert.equal(resolved.policy, "minimal");
  assert.deepEqual(resolved.include, ["stack", "error"]);
  assert.deepEqual(resolved.exclude, ["neighbors"]);
  await rm(root, { recursive: true, force: true });
});

test("repo can disable team inheritance", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-governance-off-"));
  await saveTeamConfig(root, {
    version: 1,
    defaults: { target: "cursor", policy: "strict" },
    presets: {}
  });
  await saveRepoConfig(root, {
    version: 1,
    policy: "balanced",
    target: "copilot",
    inheritTeam: false
  });

  const resolved = await resolveGovernedOptions(root, {});
  assert.equal(resolved.target, "copilot");
  assert.equal(resolved.policy, "balanced");
  await rm(root, { recursive: true, force: true });
});
