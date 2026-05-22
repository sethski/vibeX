#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { formatDoctorReport, runDoctor } from "./core/doctor.js";
import { optimizePrompt } from "./core/formatter.js";
import { createPreview } from "./core/preview.js";
import { clearProjectMemory, loadProjectMemory, saveProjectMemory, scanProject } from "./core/memory.js";
import { isTargetProfile } from "./core/profiles.js";
import { grabContext } from "./core/context-grabber.js";
import type { CompressionOptions, ContextKey, ProjectContext, TargetProfile } from "./types.js";

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
  const explain = consumeFlag("--explain");
  if (args[0] === "doctor") {
    args.shift();
    const report = await runDoctor(process.cwd());
    console.log(json ? JSON.stringify(report, null, 2) : formatDoctorReport(report));
    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  const previewMode = args[0] === "preview";
  if (previewMode) {
    args.shift();
  }

  const copy = consumeFlag("--copy");
  const target = consumeTarget();
  const include = consumeContextKeys("--include");
  const exclude = consumeContextKeys("--exclude");
  const contextFile = consumeOption("--context-file");
  const contextJson = consumeOption("--context-json");
  const prompt = stripOuterQuotes(args.join(" ").trim());
  const context = await loadCliContext(contextFile, contextJson);
  const options: CompressionOptions = { target, include, exclude, explain };
  const optimized = previewMode
    ? createPreview(prompt, await resolveContext(context), options).optimized
    : await optimizePrompt(prompt, context, options);
  const preview = previewMode ? createPreview(prompt, await resolveContext(context), options) : undefined;

  if (copy) {
    await copyToClipboard(optimized);
  }

  if (json) {
    console.log(JSON.stringify(preview ? { ...preview, copied: copy, target } : { optimized, copied: copy, target }, null, 2));
    return;
  }

  if (preview) {
    console.log(formatPreview(preview.optimized, preview.context));
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

function consumeContextKeys(flag: string): ContextKey[] | undefined {
  const value = consumeOption(flag);
  if (!value) {
    return undefined;
  }
  const keys: ContextKey[] = [];
  const rawKeys = value.split(",").map((key) => key.trim()).filter(Boolean);
  for (const key of rawKeys) {
    if (!isContextKey(key)) {
      throw new Error(`Unsupported context key: ${key}`);
    }
    keys.push(key);
  }
  return keys;
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

async function loadCliContext(contextFile: string | undefined, contextJson: string | undefined): Promise<Partial<ProjectContext>> {
  if (contextFile) {
    return JSON.parse(await readFile(contextFile, "utf8")) as Partial<ProjectContext>;
  }
  if (contextJson) {
    return JSON.parse(contextJson) as Partial<ProjectContext>;
  }
  return {};
}

async function resolveContext(context: Partial<ProjectContext>): Promise<ProjectContext> {
  const base = await grabContext({ root: context.root });
  return {
    ...base,
    ...context,
    root: context.root ?? base.root,
    stack: context.stack ?? base.stack,
    gitSummary: context.gitSummary ?? base.gitSummary,
    recentErrors: context.recentErrors ?? base.recentErrors,
    importNeighbors: context.importNeighbors ?? base.importNeighbors
  };
}

function formatPreview(optimized: string, context: Array<{ key: string; included: boolean; reason: string }>): string {
  const lines = ["Optimized:", optimized, "", "Context:"];
  for (const item of context) {
    lines.push(`${item.included ? "IN" : "OUT"} ${item.key}${item.reason ? ` - ${item.reason}` : ""}`);
  }
  return lines.join("\n");
}

function isContextKey(value: string): value is ContextKey {
  return value === "stack" || value === "file" || value === "diff" || value === "error" || value === "neighbors";
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
