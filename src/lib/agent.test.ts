import { describe, expect, it } from "vitest";
import {
  buildFallbackAgentResult,
  createWorkflowRun,
  selectRelevantMemories
} from "./agent";
import type { BusinessMemory, Lead } from "./types";

const memories: BusinessMemory[] = [
  {
    id: "m-1",
    title: "Consultation pricing",
    content: "Discovery calls are free. Strategy sprint starts at $1,500.",
    tags: ["pricing", "consulting"],
    importance: 0.95,
    confidence: 0.9,
    updatedAt: "2026-06-19T10:00:00.000Z"
  },
  {
    id: "m-2",
    title: "Tone preference",
    content: "Owner prefers warm, concise replies with one clear question.",
    tags: ["tone", "reply"],
    importance: 0.7,
    confidence: 0.86,
    updatedAt: "2026-06-18T10:00:00.000Z"
  },
  {
    id: "m-3",
    title: "Old webinar offer",
    content: "A retired webinar promo from February should not be used.",
    tags: ["expired", "webinar"],
    importance: 0.8,
    confidence: 0.3,
    updatedAt: "2026-02-01T10:00:00.000Z"
  }
];

const lead: Lead = {
  id: "lead-1",
  name: "Alicia",
  source: "Instagram DM",
  receivedAt: "2026-06-20T06:30:00.000Z",
  message:
    "Hi, I saw your consulting post. Do you help with launch strategy and what does it cost?",
  status: "new"
};

describe("selectRelevantMemories", () => {
  it("ranks fresh, confident, tag-relevant memories above stale low-confidence memories", () => {
    const selected = selectRelevantMemories(lead, memories, 2);

    expect(selected.map((memory) => memory.id)).toEqual(["m-1", "m-2"]);
  });
});

describe("buildFallbackAgentResult", () => {
  it("creates an approval-ready sales action when Qwen is unavailable", () => {
    const selected = memories.slice(0, 2);
    const result = buildFallbackAgentResult(lead, selected);

    expect(result.intent).toBe("Service inquiry");
    expect(result.urgency).toBe("medium");
    expect(result.approvalRequired).toBe(true);
    expect(result.draftReply).toContain("Alicia");
    expect(result.followUpPlan).toHaveLength(2);
    expect(result.memoryUsed.map((memory) => memory.id)).toEqual(["m-1", "m-2"]);
  });
});

describe("createWorkflowRun", () => {
  it("returns a traceable workflow run with stage ordering and token metadata", () => {
    const run = createWorkflowRun({
      lead,
      memories,
      result: buildFallbackAgentResult(lead, memories.slice(0, 2)),
      provider: "fallback",
      tokenUsage: { promptTokens: 40, completionTokens: 120, totalTokens: 160 }
    });

    expect(run.id).toMatch(/^run-/);
    expect(run.trace.map((step) => step.stage)).toEqual([
      "ingest",
      "qualify",
      "retrieve-memory",
      "draft-action",
      "approval-gate",
      "learn"
    ]);
    expect(run.tokenUsage.totalTokens).toBe(160);
    expect(run.status).toBe("awaiting_approval");
  });
});
