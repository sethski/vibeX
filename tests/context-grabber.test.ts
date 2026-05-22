import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { grabContext } from "../src/core/context-grabber.js";
import { saveProjectMemory, scanProject } from "../src/core/memory.js";

test("grabs import neighbors from active file using aliases and relative imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "vibex-context-"));
  await mkdir(join(root, "src", "auth"), { recursive: true });
  await mkdir(join(root, "src", "lib"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { typescript: "5.0.0" }, scripts: { test: "node --test" } })
  );
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@/*": ["src/*"]
        }
      }
    })
  );
  await writeFile(join(root, "src", "auth", "session.ts"), "export const session = 1;");
  await writeFile(join(root, "src", "lib", "guards.ts"), "export const guard = true;");
  await writeFile(
    join(root, "src", "auth", "index.ts"),
    "import { session } from './session';\nimport { guard } from '@/lib/guards';\nexport const auth = [session, guard];\n"
  );

  await saveProjectMemory(root, await scanProject(root));
  const context = await grabContext({ root, activeFile: "src/auth/index.ts" });

  assert.deepEqual(context.importNeighbors.sort(), ["src/auth/session.ts", "src/lib/guards.ts"]);
  await rm(root, { recursive: true, force: true });
});
