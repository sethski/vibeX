import test from "node:test";
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

test("cli score returns quality report json", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "score",
    "--json",
    "--context-json",
    JSON.stringify({ stack: ["node"], activeFile: "src/auth.ts" }),
    "fix auth redirect issue"
  ]);
  const body = JSON.parse(stdout) as {
    optimized: string;
    quality: {
      score: number;
      grade: string;
      components: { tokenEfficiency: number };
    };
  };

  assert.match(body.optimized, /^Fix auth redirect issue/);
  assert.equal(typeof body.quality.score, "number");
  assert.match(body.quality.grade, /^[ABCDF]$/);
  assert.equal(typeof body.quality.components.tokenEfficiency, "number");
});

test("cli stp returns symbolic prompt", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "stp",
    "--context-json",
    JSON.stringify({ stack: ["node"], activeFile: "src/auth.ts", cursorLine: 42 }),
    "fix auth redirect thing"
  ]);

  assert.match(stdout.trim(), /^→ /);
  assert.match(stdout, /@src\/auth\.ts:42/);
  assert.match(stdout, /✓/);
});

test("cli sanitize returns cleaned output json", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "sanitize",
    "--json",
    "--constraints",
    "diff-only,no-explanations",
    "Here's how\n```diff\n+ const a = 1\n```"
  ]);
  const body = JSON.parse(stdout) as { cleaned_output: string; violations: string[] };

  assert.equal(Array.isArray(body.violations), true);
  assert.match(body.cleaned_output, /```diff/);
  assert.doesNotMatch(body.cleaned_output, /Here's how/);
});

test("cli validate retry returns warning-safe output", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "validate",
    "--json",
    "--retry",
    "--constraints",
    "diff-only,no-explanations",
    "Prose only output"
  ]);
  const body = JSON.parse(stdout) as { valid: boolean; cleaned_output: string; warning: string | null };

  assert.equal(typeof body.valid, "boolean");
  assert.equal(typeof body.cleaned_output, "string");
});

test("cli supports /vibe alias prefix", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "/vibe", "fix auth"]);
  assert.match(stdout.trim(), /^Fix auth/);
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

test("cli ide install returns editor snippets", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "ide",
    "install",
    "--json",
    "--editor",
    "cursor"
  ]);
  const body = JSON.parse(stdout) as { editor: string; tasksJson: string; keybindingsJson: string };

  assert.equal(body.editor, "cursor");
  assert.match(body.tasksJson, /vibex: optimize prompt/);
  assert.match(body.keybindingsJson, /workbench\.action\.tasks\.runTask/);
});

test("cli hotkey install returns shell snippet", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "hotkey", "install", "--json", "--shell", "zsh"]);
  const body = JSON.parse(stdout) as { shell: string; snippet: string };

  assert.equal(body.shell, "zsh");
  assert.match(body.snippet, /bindkey '\^G' vibex-hotkey/);
});

test("cli hotkey listen requires interactive tty", () => {
  const result = spawnSync(process.execPath, ["dist/src/cli.js", "hotkey", "listen"], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /interactive TTY/);
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

test("cli browser install returns snippet", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "browser", "install", "--json"]);
  const body = JSON.parse(stdout) as { snippet: string };

  assert.match(body.snippet, /window\.addEventListener\('message'/);
  assert.match(body.snippet, /replace-prompt/);
});

test("cli browser bridge returns payload", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "browser",
    "bridge",
    "--json",
    "--target",
    "cursor",
    "--context-json",
    JSON.stringify({ stack: ["node"], activeFile: "src/auth.ts" }),
    "fix auth"
  ]);
  const body = JSON.parse(stdout) as { version: number; action: string; target: string; text: string };

  assert.equal(body.version, 1);
  assert.equal(body.action, "replace-prompt");
  assert.equal(body.target, "cursor");
  assert.match(body.text, /^Fix auth/);
});

test("cli hotkey profile set/show/clear", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "vibex-hotkey-cli-"));
  await writeFile(join(cwd, "package.json"), JSON.stringify({ name: "tmp", private: true }));
  const cliPath = join(process.cwd(), "dist", "src", "cli.js");

  const setResult = await execFileAsync(process.execPath, [
    cliPath,
    "hotkey",
    "profile",
    "set",
    "--json",
    "--target",
    "cursor",
    "--include",
    "stack,file",
    "--context-json",
    JSON.stringify({ activeFile: "src/auth.ts" })
  ], { cwd });
  const setBody = JSON.parse(setResult.stdout) as { target: string; include: string[]; context: { activeFile: string } };
  assert.equal(setBody.target, "cursor");
  assert.deepEqual(setBody.include, ["stack", "file"]);
  assert.equal(setBody.context.activeFile, "src/auth.ts");

  const showResult = await execFileAsync(process.execPath, [cliPath, "hotkey", "profile", "show"], { cwd });
  const showBody = JSON.parse(showResult.stdout) as { target: string };
  assert.equal(showBody.target, "cursor");

  const clearResult = await execFileAsync(process.execPath, [cliPath, "hotkey", "profile", "clear", "--json"], { cwd });
  assert.equal(JSON.parse(clearResult.stdout).cleared, true);

  await rm(cwd, { recursive: true, force: true });
});

test("cli policy set/show", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "vibex-policy-cli-"));
  await writeFile(join(cwd, "package.json"), JSON.stringify({ name: "tmp", private: true }));
  const cliPath = join(process.cwd(), "dist", "src", "cli.js");

  await execFileAsync(process.execPath, [cliPath, "policy", "set", "minimal"], { cwd });
  const showResult = await execFileAsync(process.execPath, [cliPath, "policy", "show"], { cwd });
  const body = JSON.parse(showResult.stdout) as { policy: string };

  assert.equal(body.policy, "minimal");
  await rm(cwd, { recursive: true, force: true });
});

test("cli team defaults apply to optimize output target", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "vibex-team-cli-"));
  await writeFile(join(cwd, "package.json"), JSON.stringify({ name: "tmp", private: true }));
  const cliPath = join(process.cwd(), "dist", "src", "cli.js");

  await execFileAsync(process.execPath, [cliPath, "team", "init", "--org", "acme"], { cwd });
  await execFileAsync(process.execPath, [cliPath, "team", "defaults", "set", "--target", "cursor", "--policy", "strict"], { cwd });
  const run = await execFileAsync(process.execPath, [cliPath, "--json", "fix auth"], { cwd });
  const body = JSON.parse(run.stdout) as { target: string; optimized: string };

  assert.equal(body.target, "cursor");
  assert.match(body.optimized, /Fix auth/);
  await rm(cwd, { recursive: true, force: true });
});

test("cli team preset can be selected via --preset", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "vibex-team-preset-cli-"));
  await writeFile(join(cwd, "package.json"), JSON.stringify({ name: "tmp", private: true }));
  const cliPath = join(process.cwd(), "dist", "src", "cli.js");

  await execFileAsync(process.execPath, [cliPath, "team", "preset", "set", "lean", "--policy", "minimal"], { cwd });
  const run = await execFileAsync(process.execPath, [
    cliPath,
    "--json",
    "--preset",
    "lean",
    "--context-json",
    JSON.stringify({ stack: ["node"], activeFile: "src/auth.ts" }),
    "fix auth"
  ], { cwd });
  const body = JSON.parse(run.stdout) as { optimized: string };

  assert.match(body.optimized, /Keep response minimal and direct/);
  await rm(cwd, { recursive: true, force: true });
});
