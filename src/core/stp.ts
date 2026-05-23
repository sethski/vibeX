import type { ProjectContext } from "../types.js";
import { compactPrompt } from "./tokens.js";

export interface StpOptions {
  constraints?: string[];
}

export function toStpPrompt(raw: string, context: ProjectContext, options: StpOptions = {}): string {
  const parts: string[] = [`→ ${compactPrompt(raw).toLowerCase()}`];
  if (context.activeFile) {
    const filePart = context.cursorLine
      ? `@${context.activeFile}:${context.cursorLine}`
      : `@${context.activeFile}`;
    parts.push(filePart);
  }
  if (context.framework) {
    parts.push(`# ${normalizeFrameworkTag(context.framework)}`);
  } else if (context.stack.length > 0) {
    parts.push(`# ${context.stack[0]}`);
  }
  const error = context.recentErrors.at(-1);
  if (error) {
    parts.push(`! ${stripPunctuation(error)}`);
  }
  const constraints = options.constraints?.length
    ? options.constraints
    : ["diff-only", "no-explanations"];
  parts.push(`✓ ${constraints.join(" | ")}`);
  return parts.join(" | ");
}

function normalizeFrameworkTag(value: string): string {
  const lower = value.toLowerCase();
  if (lower === "nextjs") {
    return "Next14";
  }
  if (lower === "sveltekit") {
    return "SvelteKit";
  }
  return value;
}

function stripPunctuation(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/[|]/g, "");
}
