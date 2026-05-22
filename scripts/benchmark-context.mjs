import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { scanProject, saveProjectMemory } from "../dist/src/core/memory.js";
import { grabContext } from "../dist/src/core/context-grabber.js";

export async function runContextBenchmark({
  root = process.cwd(),
  iterations = Number(process.env.VIBEX_BENCH_ITERATIONS ?? 20)
} = {}) {
  const memory = await scanProject(root);
  await saveProjectMemory(root, memory);

  const scanTimes = [];
  const contextTimes = [];

  for (let i = 0; i < iterations; i++) {
    const scanStart = performance.now();
    await scanProject(root);
    scanTimes.push(performance.now() - scanStart);

    const contextStart = performance.now();
    await grabContext({ root, activeFile: "src/cli.ts" });
    contextTimes.push(performance.now() - contextStart);
  }

  const avg = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const max = (values) => Math.max(...values);
  const min = (values) => Math.min(...values);

  return {
    iterations,
    scan: {
      avgMs: Number(avg(scanTimes).toFixed(2)),
      minMs: Number(min(scanTimes).toFixed(2)),
      maxMs: Number(max(scanTimes).toFixed(2))
    },
    context: {
      avgMs: Number(avg(contextTimes).toFixed(2)),
      minMs: Number(min(contextTimes).toFixed(2)),
      maxMs: Number(max(contextTimes).toFixed(2))
    }
  };
}

const result = await runContextBenchmark();
if (process.env.VIBEX_BENCH_OUTPUT) {
  await writeFile(process.env.VIBEX_BENCH_OUTPUT, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));
