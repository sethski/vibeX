import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("cli supports target profiles", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "--target", "cursor", "fix auth"]);

  assert.equal(stdout.trim(), "Fix auth | Preserve existing style/tests. Output changed lines only. No markdown.");
});

test("cli doctor prints JSON report", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "doctor", "--json"]);
  const body = JSON.parse(stdout) as { checks: Array<{ name: string }> };

  assert.equal(Array.isArray(body.checks), true);
  assert.equal(body.checks.some((check) => check.name === "node"), true);
});

test("cli preview prints JSON context report", async () => {
  const context = JSON.stringify({
    root: "/repo",
    stack: ["node"],
    activeFile: "src/auth.ts",
    gitSummary: "src/auth.ts | 2 +",
    recentErrors: ["Error: bad"],
    importNeighbors: []
  });
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "preview",
    "--json",
    "--include",
    "stack,file",
    "--context-json",
    context,
    "fix auth"
  ]);
  const body = JSON.parse(stdout) as { optimized: string; context: Array<{ key: string; included: boolean }> };

  assert.match(body.optimized, /Stack: node/);
  assert.deepEqual(body.context.filter((item) => item.included).map((item) => item.key), ["stack", "file"]);
});

test("cli scan supports json output", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "scan", "--json"]);
  const body = JSON.parse(stdout) as { root: string; stack: string[] };

  assert.equal(typeof body.root, "string");
  assert.equal(Array.isArray(body.stack), true);
});

test("cli context prints json context snapshot", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "context",
    "--json",
    "--active-file",
    "src/cli.ts"
  ]);
  const body = JSON.parse(stdout) as { root: string; stack: string[]; importNeighbors: string[] };

  assert.equal(typeof body.root, "string");
  assert.equal(Array.isArray(body.stack), true);
  assert.equal(Array.isArray(body.importNeighbors), true);
});
