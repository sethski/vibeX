export interface CursorOptimizeRequest {
  raw_prompt: string;
  ide_context: {
    file?: string;
    selection?: string;
    stack?: string;
  };
}

export interface CursorBadgeState {
  visible: boolean;
  label: string;
  acceptKey: "Tab" | "Enter";
}

export function createCursorOptimizeRequest(prompt: string, context: CursorOptimizeRequest["ide_context"]): CursorOptimizeRequest {
  return {
    raw_prompt: prompt,
    ide_context: context
  };
}

export function defaultCursorBadgeState(): CursorBadgeState {
  return {
    visible: true,
    label: "✨ Optimize?",
    acceptKey: "Tab"
  };
}
