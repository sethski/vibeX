export interface TerminalPreview {
  shouldOffer: boolean;
  preview: string;
}

export type ShellKind = "bash" | "zsh" | "fish" | "powershell";
const SUGGESTION_LIMIT = 8;

const BASE_PROMPT_SUGGESTIONS = [
  "debug failing tests in <file>, identify root cause, apply minimal patch, add regression test",
  "implement <feature> in <file>, include edge cases and unit tests",
  "refactor <module> for readability without behavior change, keep API stable",
  "optimize performance in <path>, profile bottleneck and provide before/after evidence",
  "add validation for <input> in <file>, return clear error message and tests",
  "fix type errors in <file>, explain each change briefly and keep runtime behavior intact",
  "review recent diff for risks, list blocking issues first, include exact file/line refs",
  "write migration plan for <change>, include rollout, fallback, and verification checklist"
];

export function formatTerminalPreview(optimized: string): TerminalPreview {
  return {
    shouldOffer: optimized.trim().length > 0,
    preview: `[vibeX] Optimize? y/N\n${optimized}`
  };
}

export function buildPromptSuggestions(current: string): string[] {
  const raw = current.trim();
  const lower = raw.toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);
  const scored = BASE_PROMPT_SUGGESTIONS
    .map((suggestion) => {
      const s = suggestion.toLowerCase();
      let score = 0;
      if (!raw) {
        score = 1;
      } else {
        for (const token of tokens) {
          if (s.includes(token)) {
            score += 2;
          }
        }
        if (s.startsWith(lower)) {
          score += 3;
        }
      }
      return { suggestion, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.suggestion.localeCompare(b.suggestion))
    .map((item) => item.suggestion);

  const contextual = raw
    ? [
        `${raw} — include root cause, exact file paths, and tests`,
        `${raw} — keep response token-efficient and implementation-ready`,
        `${raw} — output actionable steps first, then patch details`
      ]
    : [];

  return [...contextual, ...scored].slice(0, SUGGESTION_LIMIT);
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
      "function vibe",
      "  if test (count $argv) -eq 0",
      "    echo \"usage: vibe <prompt>\" >&2",
      "    echo \"Try: vibex terminal suggest --shell fish\" >&2",
      "    return 1",
      "  end",
      "  vibex --copy \"$argv\"",
      "end",
      "functions -e vx >/dev/null 2>&1",
      "alias vx=vibe",
      "complete -c vibe -f -a \"(vibex terminal suggest --shell fish --current (commandline -cp))\"",
      "complete -c vx -f -a \"(vibex terminal suggest --shell fish --current (commandline -cp))\""
    ].join("\n");
  }

  if (shell === "powershell") {
    return [
      "function vibe {",
      "  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PromptParts)",
      "  if (-not $PromptParts -or $PromptParts.Count -eq 0) {",
      "    Write-Error \"usage: vibe <prompt>\"",
      "    Write-Host \"Try: vibex terminal suggest --shell powershell\"",
      "    return",
      "  }",
      "  vibex --copy ($PromptParts -join \" \")",
      "}",
      "Set-Alias -Name vx -Value vibe -Scope Global",
      "Register-ArgumentCompleter -CommandName vibe,vx -ScriptBlock {",
      "  param($commandName, $parameterName, $wordToComplete, $commandAst, $fakeBoundParameters)",
      "  $line = $commandAst.ToString()",
      "  $current = \"\"",
      "  if ($line.Length -gt $commandName.Length) {",
      "    $current = $line.Substring($commandName.Length).TrimStart()",
      "  }",
      "  vibex terminal suggest --shell powershell --current $current | ForEach-Object {",
      "    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)",
      "  }",
      "}"
    ].join("\n");
  }

  if (shell === "zsh") {
    return [
      "vibe() {",
      "  if [ \"$#\" -eq 0 ]; then",
      "    echo \"usage: vibe <prompt>\" >&2",
      "    echo \"Try: vibex terminal suggest --shell zsh\" >&2",
      "    return 1",
      "  fi",
      "  vibex --copy \"$*\"",
      "}",
      "alias vx='vibe'",
      "_vibex_vibe_complete() {",
      "  local current=\"${words[2,-1]}\"",
      "  local -a suggestions",
      "  suggestions=(\"${(@f)$(vibex terminal suggest --shell zsh --current \"$current\")}\")",
      "  compadd -- $suggestions",
      "}",
      "compdef _vibex_vibe_complete vibe",
      "compdef _vibex_vibe_complete vx"
    ].join("\n");
  }

  return [
    "vibe() {",
    "  if [ \"$#\" -eq 0 ]; then",
    "    echo \"usage: vibe <prompt>\" >&2",
    "    echo \"Try: vibex terminal suggest --shell bash\" >&2",
    "    return 1",
    "  fi",
    "  vibex --copy \"$*\"",
    "}",
    "alias vx='vibe'",
    "_vibex_vibe_complete() {",
    "  local line=\"${COMP_LINE#${COMP_WORDS[0]}}\"",
    "  line=\"${line# }\"",
    "  local IFS=$'\\n'",
    "  COMPREPLY=($(vibex terminal suggest --shell bash --current \"$line\"))",
    "}",
    "complete -F _vibex_vibe_complete vibe",
    "complete -F _vibex_vibe_complete vx"
  ].join("\n");
}

export function buildShellHotkeySnippet(shell: ShellKind): string {
  if (shell === "fish") {
    return [
      "function __vibex_hotkey",
      "  set -l line (commandline)",
      "  set -l optimized (printf '%s' \"$line\" | vibex)",
      "  commandline -r -- $optimized",
      "  commandline -f repaint",
      "end",
      "bind \\cg __vibex_hotkey"
    ].join("\n");
  }

  if (shell === "powershell") {
    return [
      "Set-PSReadLineKeyHandler -Chord Ctrl+g -BriefDescription vibeXOptimize -ScriptBlock {",
      "  $line = $null",
      "  $cursor = 0",
      "  [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$line, [ref]$cursor)",
      "  $optimized = $line | vibex",
      "  [Microsoft.PowerShell.PSConsoleReadLine]::Replace(0, $line.Length, $optimized)",
      "}"
    ].join("\n");
  }

  if (shell === "zsh") {
    return [
      "_vibex_hotkey() {",
      "  BUFFER=\"$(printf '%s' \"$BUFFER\" | vibex)\"",
      "  CURSOR=${#BUFFER}",
      "  zle redisplay",
      "}",
      "zle -N vibex-hotkey _vibex_hotkey",
      "bindkey '^G' vibex-hotkey"
    ].join("\n");
  }

  return [
    "__vibex_hotkey() {",
    "  READLINE_LINE=\"$(printf '%s' \"$READLINE_LINE\" | vibex)\"",
    "  READLINE_POINT=${#READLINE_LINE}",
    "}",
    "bind -x '\"\\C-g\":__vibex_hotkey'"
  ].join("\n");
}
