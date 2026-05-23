import { createServer } from "../dist/src/bridge/server.js";
import { createTrayContract } from "../dist/src/ui/tray.js";
import { createBrowserWatcherContract } from "../dist/src/plugins/browser.js";
import { createCopilotAdapterTemplate } from "../dist/src/plugins/copilot.js";
import { createCursorOptimizeRequest } from "../dist/src/plugins/cursor.js";
import { sanitizeValidateWithRetry } from "../dist/src/core/retry-loop.js";

const checks = [];
const server = createServer();

await check("optimize legacy payload", async () => {
  const res = await server.inject({
    method: "POST",
    url: "/optimize",
    body: JSON.stringify({ prompt: "fix auth", context: { activeFile: "src/auth.ts", stack: ["node"] } })
  });
  const body = JSON.parse(res.body);
  return res.statusCode === 200 && typeof body.stp_prompt === "string";
});

await check("optimize spec2 payload", async () => {
  const res = await server.inject({
    method: "POST",
    url: "/optimize",
    body: JSON.stringify({ raw_prompt: "fix auth", ide_context: { file: "src/auth.ts", line_start: 42 } })
  });
  const body = JSON.parse(res.body);
  return res.statusCode === 200 && typeof body.state_anchor === "string";
});

await check("sanitize endpoint", async () => {
  const res = await server.inject({
    method: "POST",
    url: "/sanitize",
    body: JSON.stringify({
      ai_output: "Here is how\n```diff\n+const x=1\n```",
      constraints: ["diff-only", "no-explanations"]
    })
  });
  const body = JSON.parse(res.body);
  return res.statusCode === 200 && typeof body.cleaned_output === "string";
});

await check("validate endpoint retry", async () => {
  const res = await server.inject({
    method: "POST",
    url: "/validate",
    body: JSON.stringify({
      ai_output: "plain prose",
      constraints: ["diff-only", "no-explanations"],
      project_root: process.cwd()
    })
  });
  const body = JSON.parse(res.body);
  return res.statusCode === 200 && typeof body.valid === "boolean";
});

await check("retry loop fallback warning", async () => {
  const result = await sanitizeValidateWithRetry("prose only", ["diff-only", "no-explanations"], process.cwd());
  return result.valid === false && result.warning === "constraint-violation";
});

await check("tray contract", async () => {
  const tray = createTrayContract({
    serverHealthy: true,
    optimizeEnabled: true,
    authMode: "open",
    cachePath: ".vibex/cache/intents.json"
  });
  return tray.actions.length >= 4;
});

await check("browser watcher contract", async () => {
  const contract = createBrowserWatcherContract();
  return contract.events.optimizeRequest === "vibex.optimize.request";
});

await check("cursor adapter contract", async () => {
  const payload = createCursorOptimizeRequest("fix auth", { file: "src/auth.ts" });
  return payload.raw_prompt === "fix auth";
});

await check("copilot adapter template", async () => {
  const tpl = createCopilotAdapterTemplate();
  return tpl.request.endpoint === "/optimize" && tpl.replacement.sourceField === "stp_prompt";
});

const failures = checks.filter((c) => !c.ok);
if (failures.length > 0) {
  console.log(JSON.stringify({ ok: false, checks }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

async function check(name, run) {
  try {
    const ok = await run();
    checks.push({ name, ok: Boolean(ok) });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}
