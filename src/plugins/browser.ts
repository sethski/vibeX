import type { TargetProfile } from "../types.js";

export interface BrowserBridgePayload {
  version: 1;
  action: "replace-prompt";
  target: TargetProfile;
  text: string;
}

export function createBrowserBridgePayload(optimized: string, target: TargetProfile): BrowserBridgePayload {
  return {
    version: 1,
    action: "replace-prompt",
    target,
    text: optimized
  };
}

export function browserInstallSnippet(): string {
  return [
    "window.addEventListener('message', (event) => {",
    "  const payload = event.data;",
    "  if (!payload || payload.version !== 1 || payload.action !== 'replace-prompt') return;",
    "  // Replace the active prompt textarea/input with payload.text.",
    "});"
  ].join("\n");
}
