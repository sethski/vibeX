import type { PolicyMode } from "../types.js";

export function isPolicyMode(value: string): value is PolicyMode {
  return value === "strict" || value === "balanced" || value === "minimal";
}

export function normalizePolicy(value: unknown): PolicyMode {
  if (typeof value === "string" && isPolicyMode(value)) {
    return value;
  }
  return "balanced";
}
