import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearHotkeyProfile, loadHotkeyProfile, saveHotkeyProfile } from "../src/plugins/hotkey-profile.js";

test("saves, loads, and clears hotkey profile", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-hotkey-profile-"));
  await saveHotkeyProfile(root, {
    version: 1,
    target: "cursor",
    include: ["stack", "file"],
    context: { activeFile: "src/auth.ts" }
  });

  const loaded = await loadHotkeyProfile(root);
  assert.equal(loaded?.target, "cursor");
  assert.deepEqual(loaded?.include, ["stack", "file"]);

  await clearHotkeyProfile(root);
  assert.equal(await loadHotkeyProfile(root), null);
  await rm(root, { recursive: true, force: true });
});
