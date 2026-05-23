import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createCopilotAdapterTemplate } from "../src/plugins/copilot.js";
import { createCursorOptimizeRequest, defaultCursorBadgeState } from "../src/plugins/cursor.js";
import { createIdeOptimizeBadgePayload } from "../src/plugins/ide-light.js";

test("cursor adapter request contract is SPEC2 compatible", () => {
  const payload = createCursorOptimizeRequest("fix auth", {
    file: "src/auth.ts",
    selection: "lines 42-58",
    stack: "Next14"
  });

  assert.equal(payload.raw_prompt, "fix auth");
  assert.equal(payload.ide_context.file, "src/auth.ts");
  assert.equal(payload.ide_context.selection, "lines 42-58");
  assert.equal(payload.ide_context.stack, "Next14");
});

test("cursor and ide badge defaults expose optimize affordance", () => {
  const cursorBadge = defaultCursorBadgeState();
  const ideBadge = createIdeOptimizeBadgePayload();

  assert.equal(cursorBadge.visible, true);
  assert.match(cursorBadge.label, /Optimize\?/);
  assert.equal(ideBadge.acceptKey, "Tab");
  assert.equal(ideBadge.action, "replace-prompt");
});

test("copilot adapter template uses optimize endpoint and stp replacement", () => {
  const tpl = createCopilotAdapterTemplate();

  assert.equal(tpl.version, 1);
  assert.equal(tpl.request.endpoint, "/optimize");
  assert.equal(tpl.request.shape, "raw_prompt+ide_context");
  assert.equal(tpl.replacement.sourceField, "stp_prompt");
});

test("claude python wrapper composes model+prompt flags", async () => {
  const source = await readFile(join(process.cwd(), "plugins", "claude.py"), "utf8");

  assert.match(source, /--model/);
  assert.match(source, /haiku/);
  assert.match(source, /-p/);
  assert.match(source, /inject_haiku/);
});
