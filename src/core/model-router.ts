import { loadModelsConfig } from "../config/spec2.js";
import type { TargetProfile } from "../types.js";

export interface ModelRoute {
  tool: string;
  modelFlag: string | null;
  hint: string | null;
  compressionLevel: "dense" | "balanced";
  fallback: "auto";
}

export async function routeModel(
  prompt: string,
  target: TargetProfile | undefined,
  root = process.cwd()
): Promise<ModelRoute> {
  const config = await loadModelsConfig(root);
  const tool = target ?? "auto";
  const entry = config[tool] ?? config.auto ?? { modelFlag: null, hint: null };
  return {
    tool,
    modelFlag: tool === "claude" ? entry.modelFlag : null,
    hint: tool === "claude" ? null : entry.hint,
    compressionLevel: prompt.split(/\s+/).length < 10 ? "dense" : "balanced",
    fallback: "auto"
  };
}
