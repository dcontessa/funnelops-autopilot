import type { WorkflowRun } from "./types";

export type UsageSummary = {
  totalRuns: number;
  qwenRuns: number;
  fallbackRuns: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export const summarizeUsage = (runs: WorkflowRun[]): UsageSummary =>
  runs.reduce<UsageSummary>(
    (summary, run) => ({
      totalRuns: summary.totalRuns + 1,
      qwenRuns: summary.qwenRuns + (run.provider === "qwen" ? 1 : 0),
      fallbackRuns: summary.fallbackRuns + (run.provider === "fallback" ? 1 : 0),
      promptTokens: summary.promptTokens + run.tokenUsage.promptTokens,
      completionTokens: summary.completionTokens + run.tokenUsage.completionTokens,
      totalTokens: summary.totalTokens + run.tokenUsage.totalTokens
    }),
    {
      totalRuns: 0,
      qwenRuns: 0,
      fallbackRuns: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    }
  );
