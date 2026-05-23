import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { analyzePrompt } from "../core/analyzer.js";
import { compressPrompt } from "../core/compressor.js";
import { grabContext } from "../core/context-grabber.js";
import { resolveGovernedOptions } from "../core/governance.js";
import { saveIntentTriple } from "../core/intent-cache.js";
import { routeModel } from "../core/model-router.js";
import { applyTargetProfile } from "../core/profiles.js";
import { createPreview, filterContext } from "../core/preview.js";
import { scoreOptimization } from "../core/quality.js";
import { sanitizeValidateWithRetry } from "../core/retry-loop.js";
import { sanitizeOutput } from "../core/sanitize.js";
import { buildStateAnchor, formatStateAnchor } from "../core/state-anchor.js";
import { toStpPrompt } from "../core/stp.js";
import { validateOutput } from "../core/validate.js";
import { createBrowserBridgePayload } from "../plugins/browser.js";
import { createIdeBridgePayload } from "../plugins/ide-light.js";
import { formatTerminalPreview } from "../plugins/terminal.js";
import type { CompressionOptions, ProjectContext, Spec2IdeContext } from "../types.js";

interface InjectRequest {
  method: "GET" | "POST";
  url: string;
  body?: string;
  headers?: Record<string, string>;
}

interface InjectResponse {
  statusCode: number;
  body: string;
}

export function createServer() {
  return {
    async inject(request: InjectRequest): Promise<InjectResponse> {
      return route(request.method, request.url, request.body, request.headers);
    },
    listen(port = 7742, host = "127.0.0.1"): Promise<void> {
      const server = createHttpServer(async (req, res) => {
        const body = await readBody(req);
        const response = await route(
          (req.method ?? "GET") as "GET" | "POST",
          req.url ?? "/",
          body,
          normalizeHeaders(req.headers)
        );
        writeJson(res, response.statusCode, response.body);
      });
      return new Promise((resolve) => server.listen(port, host, resolve));
    }
  };
}

async function route(
  method: "GET" | "POST",
  url: string,
  body?: string,
  headers: Record<string, string> = {}
): Promise<InjectResponse> {
  if (method === "GET" && url === "/health") {
    return json(200, { status: "ok", service: "vibex" });
  }

  if (method === "POST" && requiresAuth(url) && !isAuthorized(headers)) {
    return json(401, { error: "Unauthorized" });
  }

  if (
    method === "POST"
    && (
      url === "/optimize"
      || url === "/preview"
      || url === "/score"
      || url === "/sanitize"
      || url === "/validate"
      || url === "/bridge/ide"
      || url === "/bridge/terminal"
      || url === "/bridge/browser"
    )
  ) {
    try {
      const payload = body ? JSON.parse(body) as Record<string, unknown> : {};

      if (url === "/sanitize") {
        const aiOutput = typeof payload.ai_output === "string" ? payload.ai_output : "";
        const constraints = toConstraints(payload.constraints);
        const sanitized = await sanitizeOutput(aiOutput, constraints);
        return json(200, {
          cleaned_output: sanitized.cleanedOutput,
          violations: sanitized.violations
        });
      }

      if (url === "/validate") {
        const constraints = toConstraints(payload.constraints);
        const projectRoot = typeof payload.project_root === "string" ? payload.project_root : process.cwd();
        if (typeof payload.ai_output === "string") {
          const retried = await sanitizeValidateWithRetry(payload.ai_output, constraints, projectRoot);
          return json(200, {
            valid: retried.valid,
            violations: retried.violations,
            retry_prompt: retried.valid ? null : "↻ constraint correction",
            cleaned_output: retried.cleanedOutput,
            warning: retried.warning ?? null
          });
        }
        const cleanedOutput = typeof payload.cleaned_output === "string" ? payload.cleaned_output : "";
        const validated = await validateOutput(cleanedOutput, { projectRoot, constraints });
        return json(200, {
          valid: validated.valid,
          violations: validated.violations,
          retry_prompt: validated.retryPrompt
        });
      }

      const normalized = normalizeOptimizePayload(payload);
      if (!normalized.prompt) {
        return json(400, { error: "Prompt is required" });
      }

      const { prompt, contextSeed, options } = normalized;
      const baseContext = await grabContext({ root: contextSeed.root });
      const context: ProjectContext = {
        ...baseContext,
        ...contextSeed,
        root: contextSeed.root ?? baseContext.root,
        stack: contextSeed.stack ?? baseContext.stack,
        gitSummary: contextSeed.gitSummary ?? baseContext.gitSummary,
        recentErrors: contextSeed.recentErrors ?? baseContext.recentErrors,
        importNeighbors: contextSeed.importNeighbors ?? baseContext.importNeighbors
      };
      const governed = await resolveGovernedOptions(baseContext.root, options);
      const analysis = analyzePrompt(prompt);
      const preview = createPreview(prompt, context, governed);
      const compressed = (url === "/preview" || url === "/score")
        ? preview
        : compressPrompt(prompt, filterContext(context, governed), governed);
      const optimized = applyTargetProfile(compressed.optimized, governed.target);
      const routeDecision = await routeModel(prompt, governed.target, baseContext.root);
      const constraints = ["diff-only", "no-explanations", "exact-line-refs"];
      const stpPrompt = toStpPrompt(prompt, context, { constraints });
      const stateAnchor = formatStateAnchor(buildStateAnchor(prompt, optimized));
      try {
        await saveIntentTriple(prompt, stpPrompt, optimized, baseContext.root);
      } catch {
        // Cache persistence is best-effort and must not break request flow.
      }

      if (url === "/bridge/ide") {
        return json(200, createIdeBridgePayload(optimized));
      }
      if (url === "/bridge/terminal") {
        const terminal = formatTerminalPreview(optimized);
        return json(200, {
          ...terminal,
          optimized
        });
      }
      if (url === "/bridge/browser") {
        return json(200, createBrowserBridgePayload(optimized, governed.target ?? "codex"));
      }
      if (url === "/score") {
        return json(200, {
          optimized,
          tokenEstimate: compressed.tokenEstimate,
          contextUsed: compressed.contextUsed,
          quality: scoreOptimization(prompt, preview),
          stp_prompt: stpPrompt,
          model_flag: routeDecision.modelFlag
        });
      }

      return json(200, {
        optimized,
        analysis,
        tokenEstimate: compressed.tokenEstimate,
        contextUsed: compressed.contextUsed,
        stp_prompt: stpPrompt,
        model_flag: routeDecision.modelFlag,
        state_anchor: stateAnchor,
        confidence: analysis.confidence,
        ...(url === "/preview" ? { context: preview.context } : {})
      });
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : "Invalid request" });
    }
  }

  return json(404, { error: "Not found" });
}

function json(statusCode: number, data: unknown): InjectResponse {
  return { statusCode, body: JSON.stringify(data) };
}

function writeJson(res: ServerResponse, statusCode: number, body: string): void {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(body);
}

function requiresAuth(url: string): boolean {
  return url === "/optimize" || url === "/sanitize" || url === "/validate";
}

function isAuthorized(headers: Record<string, string>): boolean {
  const token = process.env.VIBEX_AUTH_TOKEN;
  if (!token) {
    return true;
  }
  const headerToken = headers["x-vibex-token"] ?? extractBearer(headers.authorization);
  return headerToken === token;
}

function extractBearer(authorization: string | undefined): string | undefined {
  if (!authorization) {
    return undefined;
  }
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function normalizeHeaders(raw: IncomingMessage["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      out[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      out[key.toLowerCase()] = value[0];
    }
  }
  return out;
}

function normalizeOptimizePayload(payload: Record<string, unknown>): {
  prompt: string;
  contextSeed: Partial<ProjectContext>;
  options: CompressionOptions;
} {
  const prompt = typeof payload.prompt === "string"
    ? payload.prompt.trim()
    : typeof payload.raw_prompt === "string"
    ? payload.raw_prompt.trim()
    : "";
  const context = isRecord(payload.context) ? payload.context : undefined;
  const ideContext = isRecord(payload.ide_context) ? payload.ide_context as Spec2IdeContext : undefined;
  const options = isRecord(payload.options) ? payload.options as CompressionOptions : {};
  const contextSeed: Partial<ProjectContext> = {
    ...(context as Partial<ProjectContext> | undefined),
    ...(ideContext ? mapIdeContext(ideContext) : {})
  };
  return { prompt, contextSeed, options };
}

function mapIdeContext(context: Spec2IdeContext): Partial<ProjectContext> {
  const stack = context.stack ? [context.stack] : undefined;
  const file = context.file?.trim();
  const cursorLine = context.line_start;
  return {
    root: context.root,
    activeFile: file,
    cursorLine: typeof cursorLine === "number" ? cursorLine : undefined,
    stack,
    recentErrors: context.error ? [context.error] : undefined
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toConstraints(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  await createServer().listen(Number(process.env.VIBEX_PORT ?? 7742));
  console.log(`vibeX server listening on http://127.0.0.1:${process.env.VIBEX_PORT ?? 7742}`);
}
