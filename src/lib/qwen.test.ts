import { describe, expect, it } from "vitest";
import { normalizeQwenAgentResult } from "./qwen";
import type { BusinessMemory, Lead } from "./types";

const lead: Lead = {
  id: "lead-qwen",
  name: "Farah",
  source: "Website form",
  receivedAt: "2026-06-20T08:00:00.000Z",
  message: "Can you quote a launch strategy package for my clinic?",
  status: "new"
};

const memory: BusinessMemory = {
  id: "m-pricing",
  title: "Quote rule",
  content: "Quote requests need human approval before sending.",
  tags: ["pricing", "approval"],
  importance: 0.9,
  confidence: 0.9,
  updatedAt: "2026-06-20T07:00:00.000Z"
};

describe("normalizeQwenAgentResult", () => {
  it("parses fenced JSON and attaches selected memories", () => {
    const raw = `Here is the result:\n\n\`\`\`json\n{\n  "intent": "Quote request",\n  "urgency": "high",\n  "budgetSignal": "Asked for quote",\n  "objections": ["Needs price clarity"],\n  "missingInfo": ["Timeline"],\n  "nextBestAction": "Ask two qualification questions before quote.",\n  "draftReply": "Hi Farah, yes, I can help.",\n  "followUpPlan": [{"label":"Follow up","timing":"Tomorrow","owner":"agent"}],\n  "approvalRequired": true,\n  "confidence": 0.83\n}\n\`\`\``;

    const result = normalizeQwenAgentResult(raw, lead, [memory]);

    expect(result.intent).toBe("Quote request");
    expect(result.urgency).toBe("high");
    expect(result.memoryUsed).toEqual([memory]);
    expect(result.followUpPlan[0].owner).toBe("agent");
  });
});
