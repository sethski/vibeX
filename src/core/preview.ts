import type { CompressionOptions, ContextKey, PreviewContextItem, PreviewResult, ProjectContext } from "../types.js";
import { compressPrompt } from "./compressor.js";
import { compactPrompt } from "./tokens.js";

export function createPreview(raw: string, context: ProjectContext, options: CompressionOptions = {}): PreviewResult {
  const filtered = filterContext(context, options);
  const compressed = compressPrompt(raw, filtered, options);
  const contextItems = describeContext(context, compressed.contextUsed, options);
  const optimized = shouldFallback(contextItems) ? `${compactPrompt(raw)} | Clarify exact file/component before editing.` : compressed.optimized;

  return {
    ...compressed,
    optimized,
    context: contextItems
  };
}

export function filterContext(context: ProjectContext, options: CompressionOptions = {}): ProjectContext {
  return {
    ...context,
    stack: allows("stack", options) ? context.stack : [],
    activeFile: allows("file", options) ? context.activeFile : undefined,
    cursorLine: allows("file", options) ? context.cursorLine : undefined,
    gitSummary: allows("diff", options) ? context.gitSummary : "",
    recentErrors: allows("error", options) ? context.recentErrors : [],
    importNeighbors: allows("neighbors", options) ? context.importNeighbors : []
  };
}

function describeContext(
  context: ProjectContext,
  used: string[],
  options: CompressionOptions
): PreviewContextItem[] {
  return [
    item("stack", "Stack", context.stack.join(" "), used.includes("stack"), "Project stack from package metadata.", options),
    item(
      "file",
      "File",
      context.activeFile ? `${context.activeFile}${context.cursorLine ? `:${context.cursorLine}` : ""}` : "",
      used.includes("activeFile"),
      "Active file anchors the request.",
      options
    ),
    item("error", "Error", context.recentErrors.at(-1) ?? "", used.includes("recentErrors"), "Recent terminal error is included for debug-like prompts.", options),
    item("neighbors", "Neighbors", context.importNeighbors.slice(0, 2).join(" "), used.includes("importNeighbors"), "Import neighbors provide nearby code context.", options),
    item("diff", "Diff", context.gitSummary, used.includes("gitSummary"), "Git diff summary is included only when useful and trimmed first.", options)
  ];
}

function item(
  key: ContextKey,
  label: string,
  value: string,
  used: boolean,
  reason: string,
  options: CompressionOptions
): PreviewContextItem {
  const allowed = allows(key, options);
  const included = allowed && used;
  const confidence = confidenceFor(key, value);
  return {
    key,
    label,
    included,
    confidence,
    value: options.explain && included ? value : undefined,
    reason: options.explain ? (allowed ? reason : "Excluded by user filter.") : ""
  };
}

function allows(key: ContextKey, options: CompressionOptions): boolean {
  if (options.include && !options.include.includes(key)) {
    return false;
  }
  if (options.exclude?.includes(key)) {
    return false;
  }
  return true;
}

function shouldFallback(items: PreviewContextItem[]): boolean {
  return items.every((item) => item.confidence < 0.35);
}

function confidenceFor(key: ContextKey, value: string): number {
  const hasValue = value.trim().length > 0;
  if (!hasValue) {
    return 0;
  }
  if (key === "file") {
    return 0.95;
  }
  if (key === "stack") {
    return 0.9;
  }
  if (key === "error") {
    return value.includes(":") ? 0.8 : 0.65;
  }
  if (key === "neighbors") {
    return value.split(/\s+/).filter(Boolean).length >= 2 ? 0.7 : 0.55;
  }
  if (key === "diff") {
    return /\d/.test(value) ? 0.6 : 0.45;
  }
  return 0.5;
}
