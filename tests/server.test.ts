import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/bridge/server.js";

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
