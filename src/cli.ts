#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { formatDoctorReport, runDoctor } from "./core/doctor.js";
import { optimizePrompt } from "./core/formatter.js";
import { resolveGovernedOptions } from "./core/governance.js";
import { createPreview } from "./core/preview.js";
import { scoreOptimization } from "./core/quality.js";
import { loadRepoConfig, saveRepoConfig } from "./core/repo-config.js";
import { clearProjectMemory, loadProjectMemory, saveProjectMemory, scanProject } from "./core/memory.js";
import { isPolicyMode } from "./core/policy.js";
import { isTargetProfile } from "./core/profiles.js";
import { loadTeamConfig, saveTeamConfig } from "./core/team-config.js";
import { grabContext } from "./core/context-grabber.js";
import { compactPrompt, compareTokenUsage, estimateTokenCount } from "./core/tokens.js";
import { browserInstallSnippet, createBrowserBridgePayload } from "./plugins/browser.js";
import { runHotkeyListener } from "./plugins/hotkey-listener.js";
import { clearHotkeyProfile, loadHotkeyProfile, saveHotkeyProfile } from "./plugins/hotkey-profile.js";
import { buildIdeInstallSnippet, createIdeBridgePayload, isEditorKind } from "./plugins/ide-light.js";
import {
  buildShellHotkeySnippet,
  buildShellInstallSnippet,
  defaultShellKind,
  formatTerminalPreview,
  isShellKind,
  type ShellKind
} from "./plugins/terminal.js";
import type { CompressionOptions, ContextKey, PolicyMode, ProjectContext, TargetProfile } from "./types.js";

const args = process.argv.slice(2);

async function main(): Promise<void> {
  const json = consumeFlag("--json");
  let explain = consumeFlag("--explain");

  if (args[0] === "scan") {
    args.shift();
    const memory = await scanProject(process.cwd());
    if (json) {
      console.log(JSON.stringify(memory, null, 2));
    } else {
      await saveProjectMemory(process.cwd(), memory);
      console.log(`Scanned ${memory.root}`);
    }
    return;
  }

  if (args[0] === "context") {
    args.shift();
    const activeFile = consumeOption("--active-file");
    const cursorLineValue = consumeOption("--cursor-line");
    const cursorLine = cursorLineValue ? Number(cursorLineValue) : undefined;
    const context = await grabContext({ root: process.cwd(), activeFile, cursorLine });
    if (json) {
      console.log(JSON.stringify(context, null, 2));
    } else {
      console.log(JSON.stringify({
        root: context.root,
        stack: context.stack,
        framework: context.framework,
        packageManager: context.packageManager,
        activeFile: context.activeFile,
        importNeighbors: context.importNeighbors
      }, null, 2));
    }
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

  if (args[0] === "doctor") {
    args.shift();
    const report = await runDoctor(process.cwd());
    console.log(json ? JSON.stringify(report, null, 2) : formatDoctorReport(report));
    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (args[0] === "policy") {
    args.shift();
    const action = args.shift() ?? "show";
    if (action === "show") {
      console.log(JSON.stringify(await loadRepoConfig(process.cwd()), null, 2));
      return;
    }
    if (action === "set") {
      const value = args.shift();
      if (!value || !isPolicyMode(value)) {
        throw new Error("Policy must be one of: strict, balanced, minimal");
      }
      const current = await loadRepoConfig(process.cwd());
      const next = { ...current, policy: value };
      await saveRepoConfig(process.cwd(), next);
      console.log(json ? JSON.stringify(next, null, 2) : `Policy set to ${value}`);
      return;
    }
    throw new Error(`Unsupported policy command: ${action}`);
  }

  if (args[0] === "team") {
    args.shift();
    const action = args.shift() ?? "show";
    if (action === "show") {
      console.log(JSON.stringify(await loadTeamConfig(process.cwd()), null, 2));
      return;
    }
    if (action === "init") {
      const current = await loadTeamConfig(process.cwd());
      const org = consumeOption("--org");
      const next = {
        ...current,
        org: org?.trim() ? org.trim() : current.org
      };
      await saveTeamConfig(process.cwd(), next);
      console.log(json ? JSON.stringify(next, null, 2) : "Initialized .vibex/team.json");
      return;
    }
    if (action === "defaults") {
      const verb = args.shift() ?? "show";
      if (verb !== "set") {
        throw new Error(`Unsupported team defaults command: ${verb}`);
      }
      const current = await loadTeamConfig(process.cwd());
      current.defaults = {
        ...current.defaults,
        ...consumeTeamOptions()
      };
      await saveTeamConfig(process.cwd(), current);
      console.log(json ? JSON.stringify(current, null, 2) : "Updated team defaults");
      return;
    }
    if (action === "preset") {
      const verb = args.shift() ?? "show";
      const name = (args.shift() ?? "").trim();
      if (!name) {
        throw new Error("Preset name is required");
      }
      const current = await loadTeamConfig(process.cwd());
      if (verb === "set") {
        current.presets[name] = {
          ...(current.presets[name] ?? {}),
          ...consumeTeamOptions()
        };
        await saveTeamConfig(process.cwd(), current);
        console.log(json ? JSON.stringify(current, null, 2) : `Updated team preset ${name}`);
        return;
      }
      if (verb === "clear") {
        delete current.presets[name];
        await saveTeamConfig(process.cwd(), current);
        console.log(json ? JSON.stringify(current, null, 2) : `Cleared team preset ${name}`);
        return;
      }
      throw new Error(`Unsupported team preset command: ${verb}`);
    }
    throw new Error(`Unsupported team command: ${action}`);
  }

  if (args[0] === "terminal") {
    args.shift();
    const subcommand = args.shift() ?? "preview";
    if (subcommand === "install") {
      const shellValue = consumeShell();
      const snippet = buildShellInstallSnippet(shellValue);
      if (json) {
        console.log(JSON.stringify({ shell: shellValue, snippet }, null, 2));
      } else {
        console.log(snippet);
      }
      return;
    }

    if (subcommand !== "preview") {
      throw new Error(`Unsupported terminal command: ${subcommand}`);
    }

    const copy = consumeFlag("--copy");
    const governed = await resolveGovernedOptions(process.cwd(), consumeRequestedOptions());
    const include = consumeContextKeys("--include");
    const exclude = consumeContextKeys("--exclude");
    const contextFile = consumeOption("--context-file");
    const contextJson = consumeOption("--context-json");
    const prompt = stripOuterQuotes(await resolvePromptArg(args));
    const context = await loadCliContext(contextFile, contextJson);
    const optimized = await optimizePrompt(prompt, context, {
      ...governed,
      include: include ?? governed.include,
      exclude: exclude ?? governed.exclude
    });
    if (copy) {
      await copyToClipboard(optimized);
    }
    const preview = formatTerminalPreview(optimized);
    if (json) {
      console.log(JSON.stringify({ ...preview, optimized, copied: copy, target: governed.target }, null, 2));
    } else {
      console.log(preview.preview);
    }
    return;
  }

  if (args[0] === "hotkey") {
    args.shift();
    const subcommand = args.shift() ?? "install";
    if (subcommand === "profile") {
      const action = args.shift() ?? "show";
      if (action === "clear") {
        await clearHotkeyProfile(process.cwd());
        if (json) {
          console.log(JSON.stringify({ cleared: true }, null, 2));
        } else {
          console.log("Cleared .vibex/hotkey.json");
        }
        return;
      }
      if (action === "set") {
        const current = await loadHotkeyProfile(process.cwd());
        const target = consumeOptionalTarget() ?? current?.target ?? "codex";
        const include = consumeContextKeys("--include") ?? current?.include;
        const exclude = consumeContextKeys("--exclude") ?? current?.exclude;
        const contextFile = consumeOption("--context-file");
        const contextJson = consumeOption("--context-json");
        const profileContext = await loadCliContext(contextFile, contextJson);
        const profile = {
          version: 1 as const,
          target,
          include,
          exclude,
          context: {
            ...(current?.context ?? {}),
            ...profileContext
          }
        };
        await saveHotkeyProfile(process.cwd(), profile);
        console.log(json ? JSON.stringify(profile, null, 2) : "Saved .vibex/hotkey.json");
        return;
      }
      if (action !== "show") {
        throw new Error(`Unsupported hotkey profile command: ${action}`);
      }
      console.log(JSON.stringify(await loadHotkeyProfile(process.cwd()), null, 2));
      return;
    }
    if (subcommand === "listen") {
      const profile = await loadHotkeyProfile(process.cwd());
      const governed = await resolveGovernedOptions(process.cwd(), consumeRequestedOptions());
      const target = consumeOptionalTarget() ?? profile?.target ?? governed.target ?? "codex";
      const include = consumeContextKeys("--include") ?? profile?.include;
      const exclude = consumeContextKeys("--exclude") ?? profile?.exclude;
      const contextFile = consumeOption("--context-file");
      const contextJson = consumeOption("--context-json");
      const context = {
        ...(profile?.context ?? {}),
        ...(await loadCliContext(contextFile, contextJson))
      };
      await runHotkeyListener({
        target,
        context,
        include,
        exclude,
        optimize: (prompt) => optimizePrompt(prompt, context, {
          ...governed,
          target,
          include,
          exclude
        })
      });
      return;
    }
    if (subcommand !== "install") {
      throw new Error(`Unsupported hotkey command: ${subcommand}`);
    }
    const shellValue = consumeShell();
    const snippet = buildShellHotkeySnippet(shellValue);
    if (json) {
      console.log(JSON.stringify({ shell: shellValue, snippet }, null, 2));
    } else {
      console.log(snippet);
    }
    return;
  }

  if (args[0] === "ide") {
    args.shift();
    const subcommand = args.shift() ?? "replace";
    if (subcommand === "install") {
      const editor = consumeOption("--editor") ?? "vscode";
      if (!isEditorKind(editor)) {
        throw new Error(`Unsupported editor: ${editor}`);
      }
      const snippet = buildIdeInstallSnippet(editor);
      if (json) {
        console.log(JSON.stringify(snippet, null, 2));
      } else {
        console.log(snippet.tasksJson);
        console.log("");
        console.log(snippet.keybindingsJson);
      }
      return;
    }
    if (subcommand !== "replace") {
      throw new Error(`Unsupported ide command: ${subcommand}`);
    }
    const governed = await resolveGovernedOptions(process.cwd(), consumeRequestedOptions());
    const include = consumeContextKeys("--include") ?? governed.include;
    const exclude = consumeContextKeys("--exclude") ?? governed.exclude;
    const contextFile = consumeOption("--context-file");
    const contextJson = consumeOption("--context-json");
    const prompt = stripOuterQuotes(await resolvePromptArg(args));
    const context = await loadCliContext(contextFile, contextJson);
    const optimized = await optimizePrompt(prompt, context, { ...governed, include, exclude });
    const payload = createIdeBridgePayload(optimized);
    if (json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(payload.replacement.text);
    }
    return;
  }

  if (args[0] === "browser") {
    args.shift();
    const subcommand = args.shift() ?? "bridge";
    if (subcommand === "install") {
      const snippet = browserInstallSnippet();
      if (json) {
        console.log(JSON.stringify({ snippet }, null, 2));
      } else {
        console.log(snippet);
      }
      return;
    }
    if (subcommand !== "bridge") {
      throw new Error(`Unsupported browser command: ${subcommand}`);
    }
    const governed = await resolveGovernedOptions(process.cwd(), consumeRequestedOptions());
    const include = consumeContextKeys("--include") ?? governed.include;
    const exclude = consumeContextKeys("--exclude") ?? governed.exclude;
    const contextFile = consumeOption("--context-file");
    const contextJson = consumeOption("--context-json");
    const prompt = stripOuterQuotes(await resolvePromptArg(args));
    const context = await loadCliContext(contextFile, contextJson);
    const optimized = await optimizePrompt(prompt, context, { ...governed, include, exclude });
    const payload = createBrowserBridgePayload(optimized, governed.target ?? "codex");
    if (json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(payload.text);
    }
    return;
  }

  if (args[0] === "score") {
    args.shift();
    const governed = await resolveGovernedOptions(process.cwd(), consumeRequestedOptions());
    const include = consumeContextKeys("--include") ?? governed.include;
    const exclude = consumeContextKeys("--exclude") ?? governed.exclude;
    const contextFile = consumeOption("--context-file");
    const contextJson = consumeOption("--context-json");
    const prompt = stripOuterQuotes(await resolvePromptArg(args));
    const context = await loadCliContext(contextFile, contextJson);
    const preview = createPreview(prompt, await resolveContext(context), {
      ...governed,
      include,
      exclude,
      explain: true
    });
    const quality = scoreOptimization(prompt, preview);

    if (json) {
      console.log(JSON.stringify({
        optimized: preview.optimized,
        tokenEstimate: preview.tokenEstimate,
        contextUsed: preview.contextUsed,
        target: governed.target,
        quality
      }, null, 2));
    } else {
      console.log([
        `Quality: ${quality.score} (${quality.grade})`,
        `Token efficiency: ${quality.components.tokenEfficiency}`,
        `Context coverage: ${quality.components.contextCoverage}`,
        `Specificity: ${quality.components.specificity}`,
        `Privacy: ${quality.components.privacy}`,
        "",
        "Optimized:",
        preview.optimized
      ].join("\n"));
    }
    return;
  }

  const compareMode = args[0] === "compare";
  if (compareMode) {
    args.shift();
  }

  const explainMode = args[0] === "explain";
  const previewMode = args[0] === "preview" || explainMode;
  if (previewMode) {
    args.shift();
  }
  if (explainMode) {
    explain = true;
  }

  const copy = consumeFlag("--copy");
  const governed = await resolveGovernedOptions(process.cwd(), consumeRequestedOptions());
  const include = consumeContextKeys("--include") ?? governed.include;
  const exclude = consumeContextKeys("--exclude") ?? governed.exclude;
  const contextFile = consumeOption("--context-file");
  const contextJson = consumeOption("--context-json");
  const prompt = stripOuterQuotes(await resolvePromptArg(args));
  const context = await loadCliContext(contextFile, contextJson);
  const options: CompressionOptions = { ...governed, include, exclude, explain };
  const optimized = previewMode
    ? createPreview(prompt, await resolveContext(context), options).optimized
    : await optimizePrompt(prompt, context, options);
  const preview = previewMode ? createPreview(prompt, await resolveContext(context), options) : undefined;
  const compareOptimized = compareMode ? enforceTokenEfficiency(prompt, optimized) : optimized;
  const compare = compareMode ? compareTokenUsage(prompt, compareOptimized) : undefined;

  if (copy) {
    await copyToClipboard(optimized);
  }

  if (json) {
    const output = preview
      ? { ...preview, copied: copy, target: governed.target }
      : compare
      ? { optimized: compareOptimized, copied: copy, target: governed.target, ...compare }
      : { optimized, copied: copy, target: governed.target };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (compare) {
    console.log(formatCompare(compare.rawTokens, compare.optimizedTokens, compare.reductionPercent, compareOptimized));
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

function consumeOptionalTarget(): TargetProfile | undefined {
  const value = consumeOption("--target");
  if (!value) {
    return undefined;
  }
  if (!isTargetProfile(value)) {
    throw new Error(`Unsupported target: ${value}`);
  }
  return value;
}

function consumeOptionalPolicy(): PolicyMode | undefined {
  const value = consumeOption("--policy");
  if (!value) {
    return undefined;
  }
  if (!isPolicyMode(value)) {
    throw new Error("Policy must be one of: strict, balanced, minimal");
  }
  return value;
}

function consumePreset(): string | undefined {
  const value = consumeOption("--preset");
  if (!value || !value.trim()) {
    return undefined;
  }
  return value.trim();
}

function consumeRequestedOptions(): CompressionOptions {
  return {
    target: consumeOptionalTarget(),
    policy: consumeOptionalPolicy(),
    preset: consumePreset()
  };
}

function consumeTeamOptions(): CompressionOptions {
  return {
    target: consumeOptionalTarget(),
    policy: consumeOptionalPolicy(),
    include: consumeContextKeys("--include"),
    exclude: consumeContextKeys("--exclude")
  };
}

function consumeShell(): ShellKind {
  const shellValue = consumeOption("--shell") ?? defaultShellKind();
  if (!isShellKind(shellValue)) {
    throw new Error(`Unsupported shell: ${shellValue}`);
  }
  return shellValue;
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

async function resolvePromptArg(parts: string[]): Promise<string> {
  const joined = parts.join(" ").trim();
  if (joined) {
    return joined;
  }
  if (process.stdin.isTTY) {
    return "";
  }
  return (await readStdin()).trim();
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

function formatCompare(rawTokens: number, optimizedTokens: number, reductionPercent: number, optimized: string): string {
  return [
    `Raw tokens: ${rawTokens}`,
    `Optimized tokens: ${optimizedTokens}`,
    `Reduction: ${reductionPercent}%`,
    "",
    "Optimized:",
    optimized
  ].join("\n");
}

function enforceTokenEfficiency(raw: string, optimized: string): string {
  if (estimateTokenCount(optimized) <= estimateTokenCount(raw)) {
    return optimized;
  }
  return compactPrompt(raw);
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

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
