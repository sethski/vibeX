export interface TerminalPreview {
  shouldOffer: boolean;
  preview: string;
}

export type ShellKind = "bash" | "zsh" | "fish" | "powershell";

export function formatTerminalPreview(optimized: string): TerminalPreview {
  return {
    shouldOffer: optimized.trim().length > 0,
    preview: `[vibeX] Optimize? y/N\n${optimized}`
  };
}

export function isShellKind(value: string): value is ShellKind {
  return value === "bash" || value === "zsh" || value === "fish" || value === "powershell";
}

export function defaultShellKind(): ShellKind {
  if (process.platform === "win32") {
    return "powershell";
  }
  return "bash";
}

export function buildShellInstallSnippet(shell: ShellKind): string {
  if (shell === "fish") {
    return [
      "function vx",
      "  if test (count $argv) -eq 0",
      "    echo \"usage: vx <prompt>\" >&2",
      "    return 1",
      "  end",
      "  vibex --copy \"$argv\"",
      "end"
    ].join("\n");
  }

  if (shell === "powershell") {
    return [
      "function vx {",
      "  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PromptParts)",
      "  if (-not $PromptParts -or $PromptParts.Count -eq 0) {",
      "    Write-Error \"usage: vx <prompt>\"",
      "    return",
      "  }",
      "  vibex --copy ($PromptParts -join \" \")",
      "}"
    ].join("\n");
  }

  return [
    "vx() {",
    "  if [ \"$#\" -eq 0 ]; then",
    "    echo \"usage: vx <prompt>\" >&2",
    "    return 1",
    "  fi",
    "  vibex --copy \"$*\"",
    "}"
  ].join("\n");
}
