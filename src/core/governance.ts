import type { CompressionOptions, ContextKey } from "../types.js";
import { loadRepoConfig } from "./repo-config.js";
import { loadTeamConfig } from "./team-config.js";

export async function resolveGovernedOptions(
  root: string,
  requested: CompressionOptions
): Promise<CompressionOptions> {
  const repo = await loadRepoConfig(root);
  const team = await loadTeamConfig(root);

  const merged: CompressionOptions = {
    target: "codex",
    policy: "balanced"
  };

  if (repo.inheritTeam) {
    apply(merged, team.defaults);
    const presetName = requested.preset ?? repo.teamPreset;
    if (presetName && team.presets[presetName]) {
      apply(merged, team.presets[presetName]);
    }
  }

  apply(merged, repo);
  apply(merged, requested);

  return merged;
}

function apply(target: CompressionOptions, source: Partial<CompressionOptions>): void {
  if (source.target) {
    target.target = source.target;
  }
  if (source.policy) {
    target.policy = source.policy;
  }
  if (source.include) {
    target.include = dedupeContextKeys(source.include);
  }
  if (source.exclude) {
    target.exclude = dedupeContextKeys(source.exclude);
  }
  if (source.explain !== undefined) {
    target.explain = source.explain;
  }
}

function dedupeContextKeys(values: ContextKey[]): ContextKey[] {
  return [...new Set(values)];
}
