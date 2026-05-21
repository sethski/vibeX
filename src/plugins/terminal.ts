export interface TerminalPreview {
  shouldOffer: boolean;
  preview: string;
}

export function formatTerminalPreview(optimized: string): TerminalPreview {
  return {
    shouldOffer: optimized.trim().length > 0,
    preview: `[vibeX] Optimize? y/N\n${optimized}`
  };
}
