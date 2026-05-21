import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("cli supports target profiles", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "--target", "cursor", "fix auth"]);

  assert.match(stdout, /Use open files and current selection first\./);
});

test("cli doctor prints JSON report", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "doctor", "--json"]);
  const body = JSON.parse(stdout) as { checks: Array<{ name: string }> };

  assert.equal(Array.isArray(body.checks), true);
  assert.equal(body.checks.some((check) => check.name === "node"), true);
});
