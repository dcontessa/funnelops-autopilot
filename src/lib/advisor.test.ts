import { describe, expect, it } from "vitest";
import { buildFallbackAdvisorReport, normalizeQwenAdvisorReport } from "./advisor";
import type { BusinessMemory, Lead, WorkflowRun } from "./types";

const leads: Lead[] = [
  {
    id: "lead-1",
    name: "Alicia",
    source: "Instagram DM",
    receivedAt: "2026-06-20T06:32:00.000Z",
    message: "Can you help with bookings and what does it cost?",
    status: "awaiting_approval"
  },
  {
    id: "lead-2",
    name: "Mei",
    source: "WhatsApp-style chat",
    receivedAt: "2026-06-20T07:20:00.000Z",
    message: "Can your AI help with WhatsApp follow-ups?",
    status: "new"
  }
];

const memories: BusinessMemory[] = [
  {
    id: "mem-approval",
    title: "Human approval rule",
    content: "Require approval for pricing.",
    tags: ["approval"],
    importance: 0.9,
    confidence: 0.9,
    updatedAt: "2026-06-20T00:00:00.000Z"
  }
];

const runs: WorkflowRun[] = [];

describe("normalizeQwenAdvisorReport", () => {
  it("parses fenced Qwen JSON into an advisor report", () => {
    const raw = `\`\`\`json\n{\n  "topPriorityLeadId": "lead-1",\n  "headline": "Prioritize pricing-sensitive local service leads.",\n  "sourceInsight": "Instagram DM is showing high purchase intent.",\n  "followUpGap": "No follow-up has been approved yet.",\n  "memoryRecommendation": "Keep approval rule active for pricing questions.",\n  "riskWarning": "Do not quote before discovery.",\n  "nextBestBusinessAction": "Approve a discovery-call reply for Alicia.",\n  "growthExperiment": "Test a WhatsApp follow-up checklist.",\n  "confidence": 0.88\n}\n\`\`\``;

    const report = normalizeQwenAdvisorReport(raw, leads, memories, runs);

    expect(report.topPriorityLeadId).toBe("lead-1");
    expect(report.confidence).toBe(0.88);
    expect(report.nextBestBusinessAction).toContain("Alicia");
  });
});

describe("buildFallbackAdvisorReport", () => {
  it("chooses an awaiting approval lead as top priority", () => {
    const report = buildFallbackAdvisorReport(leads, memories, runs);

    expect(report.topPriorityLeadId).toBe("lead-1");
    expect(report.headline).toContain("approval");
    expect(report.confidence).toBeGreaterThan(0);
  });
});
