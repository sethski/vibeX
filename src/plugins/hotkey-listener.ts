import { emitKeypressEvents } from "node:readline";
import type { ContextKey, ProjectContext, TargetProfile } from "../types.js";

export interface KeypressShape {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
}

export type HotkeyAction = "append" | "backspace" | "optimize" | "submit" | "exit" | "noop";

export function classifyHotkeyAction(char: string, key: KeypressShape): HotkeyAction {
  if (key.ctrl && key.name === "c") {
    return "exit";
  }
  if (key.ctrl && key.name === "g") {
    return "optimize";
  }
  if (key.name === "return" || key.name === "enter") {
    return "submit";
  }
  if (key.name === "backspace") {
    return "backspace";
  }
  if (char && !key.ctrl && !key.meta) {
    return "append";
  }
  return "noop";
}

export interface HotkeyListenOptions {
  target: TargetProfile;
  context: Partial<ProjectContext>;
  include?: ContextKey[];
  exclude?: ContextKey[];
  optimize: (prompt: string) => Promise<string>;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
}

export async function runHotkeyListener(options: HotkeyListenOptions): Promise<void> {
  const input = options.stdin ?? process.stdin;
  const output = options.stdout ?? process.stdout;
  if (!input.isTTY || !output.isTTY) {
    throw new Error("hotkey listen requires an interactive TTY");
  }

  let buffer = "";
  let optimizing = false;
  const redraw = (): void => {
    output.write(`\r> ${buffer}\u001b[K`);
  };

  output.write("vibeX hotkey listener: Ctrl+G optimize, Enter submit, Ctrl+C exit.\n> ");
  emitKeypressEvents(input);
  input.setRawMode?.(true);
  input.resume();

  await new Promise<void>((resolve) => {
    const onKeypress = async (char: string, key: KeypressShape): Promise<void> => {
      const action = classifyHotkeyAction(char, key);
      if (action === "exit") {
        output.write("\n");
        cleanup();
        resolve();
        return;
      }
      if (action === "submit") {
        output.write(`\n${buffer}\n> `);
        buffer = "";
        return;
      }
      if (action === "backspace") {
        buffer = buffer.slice(0, -1);
        redraw();
        return;
      }
      if (action === "append") {
        buffer += char;
        redraw();
        return;
      }
      if (action === "optimize" && !optimizing) {
        optimizing = true;
        output.write("\n[optimizing]\n");
        try {
          buffer = await options.optimize(buffer);
        } catch (error) {
          output.write(`[error] ${error instanceof Error ? error.message : String(error)}\n`);
        } finally {
          optimizing = false;
          redraw();
        }
      }
    };

    const cleanup = (): void => {
      input.off("keypress", onKeypress);
      input.setRawMode?.(false);
      input.pause();
    };

    input.on("keypress", onKeypress);
  });
}
