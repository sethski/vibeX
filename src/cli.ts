#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { formatDoctorReport, runDoctor } from "./core/doctor.js";
import { optimizePrompt } from "./core/formatter.js";
import { clearProjectMemory, loadProjectMemory, saveProjectMemory, scanProject } from "./core/memory.js";
import { isTargetProfile } from "./core/profiles.js";
import type { ProjectContext, TargetProfile } from "./types.js";

const args = process.argv.slice(2);

async function main(): Promise<void> {
  if (args[0] === "scan") {
    const memory = await scanProject(process.cwd());
    await saveProjectMemory(process.cwd(), memory);
    console.log(`Scanned ${memory.root}`);
    return;
  }

  if (args[0] === "cache" && args[1] === "clear") {
    await clearProjectMemory(process.cwd());
    console.log("Cleared .vibex/cache.json");
    return;
  }

  if (args[0] === "cache" && args[1] === "show") {
    console.log(JSON.stringify(await loadProjectMemory(process.cwd()), null, 2));
    return;
  }

  const json = consumeFlag("--json");
  if (args[0] === "doctor") {
    args.shift();
    const report = await runDoctor(process.cwd());
    console.log(json ? JSON.stringify(report, null, 2) : formatDoctorReport(report));
    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  const copy = consumeFlag("--copy");
  const target = consumeTarget();
  const contextFile = consumeOption("--context-file");
  const prompt = stripOuterQuotes(args.join(" ").trim());
  const context = contextFile ? JSON.parse(await readFile(contextFile, "utf8")) as Partial<ProjectContext> : {};
  const optimized = await optimizePrompt(prompt, context, { target });

  if (copy) {
    await copyToClipboard(optimized);
  }

  if (json) {
    console.log(JSON.stringify({ optimized, copied: copy, target }, null, 2));
    return;
  }

  console.log(optimized);
}

function consumeFlag(flag: string): boolean {
  const index = args.indexOf(flag);
  if (index < 0) {
    return false;
  }
  args.splice(index, 1);
  return true;
}

function consumeOption(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
}

function consumeTarget(): TargetProfile {
  const value = consumeOption("--target") ?? "codex";
  if (!isTargetProfile(value)) {
    throw new Error(`Unsupported target: ${value}`);
  }
  return value;
}

function stripOuterQuotes(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function copyToClipboard(value: string): Promise<void> {
  const command = process.platform === "win32" ? "clip" : process.platform === "darwin" ? "pbcopy" : "xclip";
  const args = process.platform === "linux" ? ["-selection", "clipboard"] : [];

  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    child.stdin.write(value);
    child.stdin.end();
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Clipboard command failed: ${command}`));
    });
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
