export type Health = { ok: boolean; model?: string; ollama?: string; };
export type SummaryPreset = "study_bullets"|"cheat_sheet"|"exam"|"short"|"long";
export type SummarizeArgs = { path?: string; query?: string; preset?: SummaryPreset; max_words?: number; };
export type SuggestionArgs = { mode: "summary"|"library"; path?: string; query?: string; summary?: string; };

declare global {
  interface Window {
    arcano?: {
      ping: () => Promise<Health>;
      summarizePath: (path: string, opts?: any) => Promise<any>;
      summarize: (args: SummarizeArgs) => Promise<{ ok: boolean; summary?: string; error?: string }>;
      suggestions?: (args: SuggestionArgs) => Promise<any>;
    };
  }
}
export {};
