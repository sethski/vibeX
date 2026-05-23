export type AnalysisReason = "short_prompt" | "trigger_word" | "vague_reference";

export interface AnalysisResult {
  isVague: boolean;
  confidence: number;
  reasons: AnalysisReason[];
}

export interface ProjectContext {
  root: string;
  packageRoot?: string;
  workspaceRoots?: string[];
  stack: string[];
  packageManager?: string;
  framework?: string;
  sourceRoots?: string[];
  testRoots?: string[];
  aliases?: Record<string, string[]>;
  activeFile?: string;
  cursorLine?: number;
  gitSummary: string;
  recentErrors: string[];
  importNeighbors: string[];
}

export type ContextKey = "stack" | "file" | "diff" | "error" | "neighbors";
export type PolicyMode = "strict" | "balanced" | "minimal";

export interface CompressionOptions {
  target?: TargetProfile;
  policy?: PolicyMode;
  preset?: string;
  stp?: boolean;
  constraints?: string[];
  include?: ContextKey[];
  exclude?: ContextKey[];
  explain?: boolean;
}

export interface CompressionResult {
  optimized: string;
  tokenEstimate: number;
  contextUsed: string[];
}

export interface OptimizeOptions extends CompressionOptions {
  root?: string;
}

export interface PreviewContextItem {
  key: ContextKey;
  label: string;
  included: boolean;
  confidence: number;
  value?: string;
  reason: string;
}

export interface PreviewResult extends CompressionResult {
  context: PreviewContextItem[];
}

export interface QualityReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  components: {
    tokenEfficiency: number;
    contextCoverage: number;
    specificity: number;
    privacy: number;
  };
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
  packageRoot: string;
  scannedAt: string;
  stack: string[];
  packageManager?: string;
  framework: string;
  scripts: Record<string, string>;
  likelyTestCommand?: string;
  sourceRoots: string[];
  testRoots: string[];
  workspaceRoots: string[];
  aliases: Record<string, string[]>;
  frameworkFiles: string[];
}

export interface ContextGrabberOptions {
  root?: string;
  activeFile?: string;
  cursorLine?: number;
}

export interface Spec2IdeContext {
  file?: string;
  line_start?: number;
  line_end?: number;
  selection?: string;
  stack?: string;
  error?: string;
  root?: string;
}

export interface Spec2OptimizeResponse {
  stp_prompt: string;
  model_flag: string | null;
  state_anchor: string;
  confidence: number;
}
