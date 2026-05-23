import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../src/bridge/server.js";
import { saveTeamConfig } from "../src/core/team-config.js";

test("health endpoint returns status", async () => {
  const server = createServer();
  const response = await server.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).status, "ok");
});

test("optimize endpoint validates prompt", async () => {
  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/optimize",
    body: JSON.stringify({ prompt: "" })
  });

  assert.equal(response.statusCode, 400);
});

test("optimize endpoint returns structured result", async () => {
  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/optimize",
    body: JSON.stringify({
      prompt: "fix auth",
      context: { root: "/repo", stack: ["node"], activeFile: "src/auth.ts" }
    })
  });

  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(body.optimized, /Fix auth/);
  assert.equal(body.analysis.isVague, true);
});

test("optimize endpoint accepts target without adding wrapper tokens", async () => {
  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/optimize",
    body: JSON.stringify({
      prompt: "fix auth",
      context: { root: "/repo", stack: ["node"], activeFile: "src/auth.ts" },
      options: { target: "claude" }
    })
  });

  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(body.optimized, /^Fix auth/);
  assert.doesNotMatch(body.optimized, /Think briefly|Use open files|Apply as focused/);
});

test("preview endpoint returns context details", async () => {
  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/preview",
    body: JSON.stringify({
      prompt: "fix auth",
      context: { root: "/repo", stack: ["node"], activeFile: "src/auth.ts" },
      options: { include: ["stack", "file"], explain: true }
    })
  });

  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(body.optimized, /Stack: node/);
  assert.equal(Array.isArray(body.context), true);
  assert.equal(body.context.some((item: { key: string; included: boolean }) => item.key === "file" && item.included), true);
});

test("score endpoint returns quality report", async () => {
  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/score",
    body: JSON.stringify({
      prompt: "fix auth redirect issue",
      context: { root: "/repo", stack: ["node"], activeFile: "src/auth.ts" }
    })
  });

  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(body.optimized, /Fix auth redirect issue/);
  assert.equal(typeof body.quality.score, "number");
  assert.match(body.quality.grade, /^[ABCDF]$/);
});

test("bridge ide endpoint returns replacement payload", async () => {
  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/bridge/ide",
    body: JSON.stringify({
      prompt: "fix auth",
      context: { root: "/repo", stack: ["node"], activeFile: "src/auth.ts" }
    })
  });

  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.version, 1);
  assert.equal(body.replacement.range, "active-input");
  assert.match(body.replacement.text, /^Fix auth/);
});

test("bridge terminal endpoint returns terminal preview payload", async () => {
  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/bridge/terminal",
    body: JSON.stringify({
      prompt: "fix auth",
      context: { root: "/repo", stack: ["node"], activeFile: "src/auth.ts" }
    })
  });

  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.shouldOffer, true);
  assert.match(body.preview, /\[vibeX\] Optimize\? y\/N/);
  assert.match(body.optimized, /^Fix auth/);
});

test("bridge browser endpoint returns browser payload", async () => {
  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/bridge/browser",
    body: JSON.stringify({
      prompt: "fix auth",
      context: { root: "/repo", stack: ["node"], activeFile: "src/auth.ts" },
      options: { target: "cursor" }
    })
  });

  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.version, 1);
  assert.equal(body.action, "replace-prompt");
  assert.equal(body.target, "cursor");
  assert.match(body.text, /^Fix auth/);
});

test("bridge browser endpoint applies team default target", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-server-team-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "tmp", private: true }));
  await saveTeamConfig(root, {
    version: 1,
    org: "acme",
    defaults: { target: "cursor" },
    presets: {}
  });

  const server = createServer();
  const response = await server.inject({
    method: "POST",
    url: "/bridge/browser",
    body: JSON.stringify({
      prompt: "fix auth",
      context: { root, stack: ["node"], activeFile: "src/auth.ts" }
    })
  });

  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.target, "cursor");
  await rm(root, { recursive: true, force: true });
});
