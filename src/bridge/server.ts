import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { analyzePrompt } from "../core/analyzer.js";
import { compressPrompt } from "../core/compressor.js";
import { grabContext } from "../core/context-grabber.js";
import { applyTargetProfile } from "../core/profiles.js";
import { createPreview, filterContext } from "../core/preview.js";
import { createIdeBridgePayload } from "../plugins/ide-light.js";
import { formatTerminalPreview } from "../plugins/terminal.js";
import type { CompressionOptions, ProjectContext } from "../types.js";

interface InjectRequest {
  method: "GET" | "POST";
  url: string;
  body?: string;
}

interface InjectResponse {
  statusCode: number;
  body: string;
}

export function createServer() {
  return {
    async inject(request: InjectRequest): Promise<InjectResponse> {
      return route(request.method, request.url, request.body);
    },
    listen(port = 7742, host = "127.0.0.1"): Promise<void> {
      const server = createHttpServer(async (req, res) => {
        const body = await readBody(req);
        const response = await route((req.method ?? "GET") as "GET" | "POST", req.url ?? "/", body);
        writeJson(res, response.statusCode, response.body);
      });
      return new Promise((resolve) => server.listen(port, host, resolve));
    }
  };
}

async function route(method: "GET" | "POST", url: string, body?: string): Promise<InjectResponse> {
  if (method === "GET" && url === "/health") {
    return json(200, { status: "ok", service: "vibex" });
  }

  if (
    method === "POST"
    && (url === "/optimize" || url === "/preview" || url === "/bridge/ide" || url === "/bridge/terminal")
  ) {
    try {
      const payload = body ? JSON.parse(body) as { prompt?: unknown; context?: Partial<ProjectContext>; options?: CompressionOptions } : {};
      if (typeof payload.prompt !== "string" || !payload.prompt.trim()) {
        return json(400, { error: "Prompt is required" });
      }

      const baseContext = await grabContext({ root: payload.context?.root });
      const context: ProjectContext = {
        ...baseContext,
        ...payload.context,
        root: payload.context?.root ?? baseContext.root,
        stack: payload.context?.stack ?? baseContext.stack,
        gitSummary: payload.context?.gitSummary ?? baseContext.gitSummary,
        recentErrors: payload.context?.recentErrors ?? baseContext.recentErrors,
        importNeighbors: payload.context?.importNeighbors ?? baseContext.importNeighbors
      };
      const analysis = analyzePrompt(payload.prompt);
      const preview = createPreview(payload.prompt, context, payload.options);
      const compressed = url === "/preview" ? preview : compressPrompt(payload.prompt, filterContext(context, payload.options), payload.options);
      const optimized = applyTargetProfile(compressed.optimized, payload.options?.target);

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

      return json(200, {
        optimized,
        analysis,
        tokenEstimate: compressed.tokenEstimate,
        contextUsed: compressed.contextUsed,
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
