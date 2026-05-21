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
