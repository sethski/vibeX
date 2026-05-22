import test from "node:test";
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("cli supports target profiles", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "--target", "cursor", "fix auth"]);

  assert.match(stdout.trim(), /^Fix auth \| /);
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

test("cli compare returns token reduction json", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "compare", "--json", "please fix auth redirect issue"]);
  const body = JSON.parse(stdout) as {
    rawTokens: number;
    optimizedTokens: number;
    reductionPercent: number;
    optimized: string;
  };

  assert.equal(typeof body.rawTokens, "number");
  assert.equal(typeof body.optimizedTokens, "number");
  assert.equal(typeof body.reductionPercent, "number");
  assert.equal(body.optimizedTokens <= body.rawTokens, true);
  assert.match(body.optimized, /^Fix auth redirect issue/);
});

test("json commands do not leak secrets from prompt into context metadata", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "preview",
    "--json",
    "--explain",
    "fix auth SECRET_TOKEN=abc123"
  ]);
  const body = JSON.parse(stdout) as { context: unknown };
  const text = JSON.stringify(body.context);

  assert.equal(text.includes("SECRET_TOKEN"), false);
  assert.equal(text.includes("abc123"), false);
});

test("cli explain returns preview metadata json", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "explain", "--json", "fix auth"]);
  const body = JSON.parse(stdout) as { optimized: string; context: Array<{ confidence: number; reason: string }> };

  assert.equal(Array.isArray(body.context), true);
  assert.equal(body.context.length > 0, true);
  assert.equal(typeof body.context[0].confidence, "number");
  assert.match(body.optimized, /Fix auth/);
});

test("cli terminal install returns shell snippet", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "terminal", "install", "--json", "--shell", "bash"]);
  const body = JSON.parse(stdout) as { shell: string; snippet: string };

  assert.equal(body.shell, "bash");
  assert.match(body.snippet, /vx\(\)/);
  assert.match(body.snippet, /vibex --copy/);
});

test("cli terminal preview returns bridge payload", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "terminal",
    "preview",
    "--json",
    "--context-json",
    JSON.stringify({ stack: ["node"], activeFile: "src/auth.ts" }),
    "fix auth"
  ]);
  const body = JSON.parse(stdout) as { shouldOffer: boolean; preview: string; optimized: string };

  assert.equal(body.shouldOffer, true);
  assert.match(body.preview, /\[vibeX\] Optimize\? y\/N/);
  assert.match(body.optimized, /^Fix auth/);
});

test("cli ide replace returns bridge payload", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "ide",
    "replace",
    "--json",
    "--context-json",
    JSON.stringify({ stack: ["node"], activeFile: "src/auth.ts" }),
    "fix auth"
  ]);
  const body = JSON.parse(stdout) as { version: number; replacement: { range: string; text: string } };

  assert.equal(body.version, 1);
  assert.equal(body.replacement.range, "active-input");
  assert.match(body.replacement.text, /^Fix auth/);
});

test("cli hotkey install returns shell snippet", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "hotkey", "install", "--json", "--shell", "zsh"]);
  const body = JSON.parse(stdout) as { shell: string; snippet: string };

  assert.equal(body.shell, "zsh");
  assert.match(body.snippet, /bindkey '\^G' vibex-hotkey/);
});

test("cli reads prompt from stdin when no positional prompt is provided", () => {
  const result = spawnSync(
    process.execPath,
    [
      "dist/src/cli.js",
      "--json",
      "--context-json",
      JSON.stringify({ stack: ["node"], activeFile: "src/auth.ts" })
    ],
    { encoding: "utf8", input: "fix auth from stdin\n" }
  );

  assert.equal(result.status, 0);
  const body = JSON.parse(result.stdout) as { optimized: string };
  assert.match(body.optimized, /^Fix auth from stdin/);
});
