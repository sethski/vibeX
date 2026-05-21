export type AnalysisReason = "short_prompt" | "trigger_word" | "vague_reference";

export interface AnalysisResult {
  isVague: boolean;
  confidence: number;
  reasons: AnalysisReason[];
}

export interface ProjectContext {
  root: string;
  stack: string[];
  activeFile?: string;
  cursorLine?: number;
  gitSummary: string;
  recentErrors: string[];
  importNeighbors: string[];
}

export interface CompressionOptions {
  target?: TargetProfile;
}

export interface CompressionResult {
  optimized: string;
  tokenEstimate: number;
  contextUsed: string[];
}

export interface OptimizeOptions extends CompressionOptions {
  root?: string;
}

export type TargetProfile = "codex" | "claude" | "cursor" | "copilot";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  message: string;
}

export interface DoctorReport {
  ok: boolean;
  root: string;
  checks: DoctorCheck[];
}

export interface ProjectMemory {
  version: 1;
  root: string;
  scannedAt: string;
  stack: string[];
  packageManager?: string;
  scripts: Record<string, string>;
  likelyTestCommand?: string;
  sourceRoots: string[];
  aliases: Record<string, string[]>;
  frameworkFiles: string[];
}

export interface ContextGrabberOptions {
  root?: string;
  activeFile?: string;
  cursorLine?: number;
}
