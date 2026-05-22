import test from "node:test";
import assert from "node:assert/strict";
import { dedupeAndRankErrors, summarizeDiffStat } from "../src/core/context-grabber.js";

test("summarizes diff stat into compact high-signal text", () => {
  const summary = summarizeDiffStat(
    [
      " src/auth/hooks.ts | 12 ++++++------",
      " src/lib/token.ts | 8 ++++++--",
      " src/lib/ui.tsx | 2 +-",
      " 3 files changed, 13 insertions(+), 9 deletions(-)"
    ].join("\n")
  );

  assert.match(summary, /^src\/auth\/hooks\.ts \(\+12\), src\/lib\/token\.ts \(\+8\), src\/lib\/ui\.tsx \(\+2\) \| 3 files changed/);
});

test("dedupes repeated terminal errors by fingerprint", () => {
  const errors = dedupeAndRankErrors([
    "TypeError: Cannot read property 'id' of undefined at src/auth.ts:18:10",
    "TypeError: Cannot read property 'id' of undefined at src/auth.ts:42:3",
    "Error: connect ECONNREFUSED 127.0.0.1:5432",
    "Error: connect ECONNREFUSED 127.0.0.1:5432",
    "ReferenceError: window is not defined"
  ]);

  assert.deepEqual(errors, [
    "TypeError: Cannot read property 'id' of undefined at src/auth.ts:18:10",
    "Error: connect ECONNREFUSED 127.0.0.1:5432",
    "ReferenceError: window is not defined"
  ]);
});
