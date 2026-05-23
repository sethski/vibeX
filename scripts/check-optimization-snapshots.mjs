import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPreview } from "../dist/src/core/preview.js";
import { scoreOptimization } from "../dist/src/core/quality.js";
import { compareTokenUsage } from "../dist/src/core/tokens.js";

const root = process.cwd();
const snapshotPath = join(root, "benchmarks", "optimization-snapshots.json");
const snapshots = JSON.parse(await readFile(snapshotPath, "utf8"));

const failures = [];

for (const scenario of snapshots.scenarios) {
  const context = {
    root,
    stack: [],
    gitSummary: "",
    recentErrors: [],
    importNeighbors: [],
    ...scenario.context
  };
  const options = {
    policy: scenario.policy ?? "balanced",
    include: scenario.include,
    exclude: scenario.exclude,
    explain: true
  };

  const preview = createPreview(scenario.prompt, context, options);
  const quality = scoreOptimization(scenario.prompt, preview);
  const usage = compareTokenUsage(scenario.prompt, preview.optimized);
  const optimizedHash = sha256(preview.optimized);
  const contextText = JSON.stringify(preview.context);

  if (optimizedHash !== scenario.expect.optimizedHash) {
    failures.push(`[${scenario.id}] optimized hash drifted`);
  }
  if (usage.reductionPercent < scenario.expect.minReductionPercent) {
    failures.push(
      `[${scenario.id}] reduction ${usage.reductionPercent}% < ${scenario.expect.minReductionPercent}%`
    );
  }
  if (quality.score < scenario.expect.minQualityScore) {
    failures.push(`[${scenario.id}] quality ${quality.score} < ${scenario.expect.minQualityScore}`);
  }

  for (const required of scenario.expect.mustContain ?? []) {
    if (!preview.optimized.includes(required)) {
      failures.push(`[${scenario.id}] missing required text: ${required}`);
    }
  }
  for (const blocked of scenario.expect.mustNotContain ?? []) {
    if (contextText.includes(blocked)) {
      failures.push(`[${scenario.id}] leaked blocked text: ${blocked}`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`Optimization regression: ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        ok: true,
        scenarios: snapshots.scenarios.length
      },
      null,
      2
    )
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
