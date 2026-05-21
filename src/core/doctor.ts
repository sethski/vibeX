import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DoctorCheck, DoctorReport } from "../types.js";
import { loadProjectMemory } from "./memory.js";

export async function runDoctor(root: string = process.cwd()): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const major = Number(process.versions.node.split(".")[0]);

  checks.push({
    name: "node",
    ok: major >= 20,
    message: `Node ${process.versions.node}`
  });

  const packageJson = await readPackage(root);
  checks.push({
    name: "package.json",
    ok: packageJson !== null,
    message: packageJson ? "Found package.json" : "Missing package.json"
  });

  const scripts = packageJson?.scripts;
  checks.push({
    name: "test script",
    ok: Boolean(scripts && typeof scripts === "object" && "test" in scripts),
    message: scripts && typeof scripts === "object" && "test" in scripts ? "Found npm test" : "Missing npm test"
  });

  const memory = await loadProjectMemory(root);
  checks.push({
    name: "project memory",
    ok: memory !== null,
    message: memory ? "Found .vibex/cache.json" : "Run vibex scan to create .vibex/cache.json"
  });

  return {
    ok: checks.every((check) => check.ok),
    root,
    checks
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = [`vibeX doctor: ${report.ok ? "ok" : "issues found"}`, `Root: ${report.root}`];
  for (const check of report.checks) {
    lines.push(`${check.ok ? "OK" : "WARN"} ${check.name}: ${check.message}`);
  }
  return lines.join("\n");
}

async function readPackage(root: string): Promise<{ scripts?: unknown } | null> {
  try {
    return JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { scripts?: unknown };
  } catch {
    return null;
  }
}
