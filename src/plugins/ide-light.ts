export interface IdeReplacement {
  range: "active-input";
  text: string;
}

export type EditorKind = "vscode" | "cursor";

export interface IdeBridgePayload {
  version: 1;
  replacement: IdeReplacement;
}

export interface IdeInstallSnippet {
  editor: EditorKind;
  keybindingsJson: string;
  tasksJson: string;
}

export interface IdeOptimizeBadgePayload {
  label: string;
  acceptKey: "Tab" | "Enter";
  action: "replace-prompt";
}

export function createIdeReplacement(optimized: string): IdeReplacement {
  return {
    range: "active-input",
    text: optimized
  };
}

export function createIdeBridgePayload(optimized: string): IdeBridgePayload {
  return {
    version: 1,
    replacement: createIdeReplacement(optimized)
  };
}

export function createIdeOptimizeBadgePayload(): IdeOptimizeBadgePayload {
  return {
    label: "✨ Optimize?",
    acceptKey: "Tab",
    action: "replace-prompt"
  };
}

export function isEditorKind(value: string): value is EditorKind {
  return value === "vscode" || value === "cursor";
}

export function buildIdeInstallSnippet(editor: EditorKind): IdeInstallSnippet {
  const tasksJson = [
    "{",
    "  \"version\": \"2.0.0\",",
    "  \"tasks\": [",
    "    {",
    "      \"label\": \"vibex: optimize prompt\",",
    "      \"type\": \"shell\",",
    "      \"command\": \"vibex --copy \\\"${input:vibexPrompt}\\\"\",",
    "      \"problemMatcher\": []",
    "    }",
    "  ],",
    "  \"inputs\": [",
    "    {",
    "      \"id\": \"vibexPrompt\",",
    "      \"type\": \"promptString\",",
    "      \"description\": \"Prompt text to optimize\"",
    "    }",
    "  ]",
    "}"
  ].join("\n");

  const keybindingsJson = [
    "[",
    "  {",
    "    \"key\": \"ctrl+alt+g\",",
    "    \"command\": \"workbench.action.tasks.runTask\",",
    "    \"args\": \"vibex: optimize prompt\"",
    "  }",
    "]"
  ].join("\n");

  return { editor, keybindingsJson, tasksJson };
}
