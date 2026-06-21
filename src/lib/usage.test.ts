import { describe, expect, it } from "vitest";
import { summarizeUsage } from "./usage";
import type { WorkflowRun } from "./types";

const baseRun: WorkflowRun = {
  id: "run-1",
  leadId: "lead-1",
  status: "awaiting_approval",
  provider: "qwen",
  createdAt: "2026-06-20T10:00:00.000Z",
  tokenUsage: { promptTokens: 100, completionTokens: 300, totalTokens: 400 },
  trace: [],
  result: {
    intent: "Inquiry",
    urgency: "medium",
    budgetSignal: "Asked pricing",
    objections: [],
    missingInfo: [],
    nextBestAction: "Reply",
    draftReply: "Hi",
    followUpPlan: [],
    approvalRequired: true,
    confidence: 0.8,
    memoryUsed: []
  }
};

describe("summarizeUsage", () => {
  it("summarizes Qwen and fallback runs separately", () => {
    const summary = summarizeUsage([
      baseRun,
      {
        ...baseRun,
        id: "run-2",
        provider: "fallback",
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      },
      {
        ...baseRun,
        id: "run-3",
        tokenUsage: { promptTokens: 50, completionTokens: 150, totalTokens: 200 }
      }
    ]);

    expect(summary.totalRuns).toBe(3);
    expect(summary.qwenRuns).toBe(2);
    expect(summary.fallbackRuns).toBe(1);
    expect(summary.promptTokens).toBe(150);
    expect(summary.completionTokens).toBe(450);
    expect(summary.totalTokens).toBe(600);
  });
});
