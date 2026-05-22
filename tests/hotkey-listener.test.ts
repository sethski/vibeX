import test from "node:test";
import assert from "node:assert/strict";
import { classifyHotkeyAction } from "../src/plugins/hotkey-listener.js";

test("classifies ctrl+g as optimize", () => {
  assert.equal(classifyHotkeyAction("", { ctrl: true, name: "g" }), "optimize");
});

test("classifies printable chars as append", () => {
  assert.equal(classifyHotkeyAction("a", { name: "a" }), "append");
});

test("classifies return and ctrl+c", () => {
  assert.equal(classifyHotkeyAction("", { name: "return" }), "submit");
  assert.equal(classifyHotkeyAction("", { ctrl: true, name: "c" }), "exit");
});
