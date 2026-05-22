import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runContextBenchmark } from "./benchmark-context.mjs";

const root = process.cwd();
const baselinePath = join(root, "benchmarks", "context-baseline.json");
const latestPath = join(root, "benchmarks", "context-latest.json");
const thresholdMultiplier = Number(process.env.VIBEX_BENCH_THRESHOLD_MULTIPLIER ?? 1.75);

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const latest = await runContextBenchmark({
  iterations: Number(process.env.VIBEX_BENCH_ITERATIONS ?? baseline.iterations ?? 20)
});
await writeFile(latestPath, `${JSON.stringify(latest, null, 2)}\n`, "utf8");

const checks = [
  {
    name: "scan.avgMs",
    actual: latest.scan.avgMs,
    baseline: baseline.scan.avgMs
  },
  {
    name: "context.avgMs",
    actual: latest.context.avgMs,
    baseline: baseline.context.avgMs
  }
];

const failures = checks.filter((check) => check.actual > check.baseline * thresholdMultiplier);
if (failures.length > 0) {
  for (const failure of failures) {
    console.error(
      `Benchmark regression: ${failure.name} ${failure.actual}ms > ${failure.baseline}ms * ${thresholdMultiplier}`
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        ok: true,
        thresholdMultiplier,
        baseline: {
          scanAvgMs: baseline.scan.avgMs,
          contextAvgMs: baseline.context.avgMs
        },
        latest: {
          scanAvgMs: latest.scan.avgMs,
          contextAvgMs: latest.context.avgMs
        }
      },
      null,
      2
    )
  );
}
