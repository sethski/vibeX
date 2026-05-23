import { compactPrompt } from "./tokens.js";

export interface StateAnchor {
  goal: string;
  done: string;
  next: string;
}

export function buildStateAnchor(rawPrompt: string, optimized: string, previous?: StateAnchor): StateAnchor {
  const goal = previous?.goal ?? `Fix ${compactPrompt(rawPrompt).replace(/^Fix\s+/i, "").trim()}`;
  const done = summarizeDone(optimized) ?? previous?.done ?? "Pending";
  const next = previous?.next ?? inferNext(optimized);
  return { goal, done, next };
}

export function formatStateAnchor(anchor: StateAnchor): string {
  return [
    `[GOAL] ${anchor.goal}`,
    `[DONE] ${anchor.done}`,
    `[NEXT] ${anchor.next}`
  ].join("\n");
}

function summarizeDone(optimized: string): string | null {
  const match = optimized.match(/File:\s*([^|]+)/i);
  if (!match) {
    return null;
  }
  return `Prepared patch scope for ${match[1].trim()}`;
}

function inferNext(optimized: string): string {
  if (/Error:/i.test(optimized)) {
    return "Patch failing path and verify tests";
  }
  return "Apply minimal diff and validate constraints";
}
