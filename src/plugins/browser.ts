import type { TargetProfile } from "../types.js";

export interface BrowserBridgePayload {
  version: 1;
  action: "replace-prompt";
  target: TargetProfile;
  text: string;
}

export interface BrowserWatcherContract {
  version: 1;
  channel: "vibex-browser";
  events: {
    optimizeRequest: "vibex.optimize.request";
    optimizeResponse: "vibex.optimize.response";
  };
  payloadShape: {
    raw_prompt: string;
    ide_context: {
      file?: string;
      selection?: string;
      stack?: string;
    };
  };
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

export function createBrowserWatcherContract(): BrowserWatcherContract {
  return {
    version: 1,
    channel: "vibex-browser",
    events: {
      optimizeRequest: "vibex.optimize.request",
      optimizeResponse: "vibex.optimize.response"
    },
    payloadShape: {
      raw_prompt: "string",
      ide_context: {
        file: "optional-string",
        selection: "optional-string",
        stack: "optional-string"
      }
    }
  };
}

export function browserBookmarkletSnippet(localhost = "http://127.0.0.1:7742/optimize"): string {
  const js = [
    "(function(){",
    "const el=document.activeElement;",
    "if(!el||typeof el.value!=='string') return;",
    "const raw=el.value;",
    "fetch('" + localhost + "',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({raw_prompt:raw,ide_context:{selection:'active-textarea'}})})",
    ".then(r=>r.json()).then(data=>{if(data&&data.stp_prompt){el.value=data.stp_prompt;}})",
    ".catch(()=>{});",
    "})();"
  ].join("");
  return `javascript:${encodeURIComponent(js)}`;
}
