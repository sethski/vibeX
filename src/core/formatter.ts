import type { OptimizeOptions, ProjectContext } from "../types.js";
import { grabContext } from "./context-grabber.js";
import { applyTargetProfile } from "./profiles.js";
import { createPreview } from "./preview.js";

export async function optimizePrompt(
  raw: string,
  context: Partial<ProjectContext> = {},
  options: OptimizeOptions = {}
): Promise<string> {
  if (!raw.trim()) {
    throw new Error("Prompt is required");
  }

  const resolved: ProjectContext = {
    ...(await grabContext({ root: options.root ?? context.root })),
    ...context,
    root: context.root ?? options.root ?? process.cwd(),
    stack: context.stack ?? [],
    gitSummary: context.gitSummary ?? "",
    recentErrors: context.recentErrors ?? [],
    importNeighbors: context.importNeighbors ?? []
  };

  return applyTargetProfile(createPreview(raw, resolved, options).optimized, options.target);
}
