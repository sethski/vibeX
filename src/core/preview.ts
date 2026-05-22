import type { CompressionOptions, ContextKey, PreviewContextItem, PreviewResult, ProjectContext } from "../types.js";
import { compressPrompt } from "./compressor.js";

export function createPreview(raw: string, context: ProjectContext, options: CompressionOptions = {}): PreviewResult {
  const filtered = filterContext(context, options);
  const compressed = compressPrompt(raw, filtered, options);
  const contextItems = describeContext(context, compressed.contextUsed, options);

  return {
    ...compressed,
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
  return {
    key,
    label,
    included,
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
