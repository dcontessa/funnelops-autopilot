import type {
  AgentResult,
  BusinessMemory,
  Lead,
  TokenUsage,
  TraceStep,
  WorkflowRun
} from "./types";

const tokenize = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
  );

const daysSince = (isoDate: string) => {
  const now = new Date("2026-06-20T12:00:00.000Z").getTime();
  const then = new Date(isoDate).getTime();
  return Math.max(0, (now - then) / 86_400_000);
};

export const scoreMemoryForLead = (lead: Lead, memory: BusinessMemory) => {
  const leadTokens = tokenize(`${lead.source} ${lead.message}`);
  const memoryTokens = tokenize(`${memory.title} ${memory.content} ${memory.tags.join(" ")}`);
  const overlap = [...memoryTokens].filter((token) => leadTokens.has(token)).length;
  const freshness = Math.max(0, 1 - daysSince(memory.updatedAt) / 120);
  const relevance = Math.min(1, overlap / 3);

  return memory.importance * 0.35 + memory.confidence * 0.25 + freshness * 0.2 + relevance * 0.2;
};

export const selectRelevantMemories = (
  lead: Lead,
  memories: BusinessMemory[],
  limit = 4
): BusinessMemory[] =>
  [...memories]
    .map((memory) => ({ memory, score: scoreMemoryForLead(lead, memory) }))
    .filter(({ memory }) => memory.confidence >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ memory }) => memory);

export const buildFallbackAgentResult = (
  lead: Lead,
  selectedMemories: BusinessMemory[]
): AgentResult => {
  const wantsPricing = /cost|price|quote|budget|fee|\$/i.test(lead.message);
  const wantsBooking = /call|book|appointment|meet/i.test(lead.message);

  return {
    intent: wantsPricing ? "Service inquiry" : "Inbound lead inquiry",
    urgency: wantsBooking ? "high" : "medium",
    budgetSignal: wantsPricing ? "Asked about cost or quote" : "Budget not stated",
    objections: wantsPricing ? ["Needs pricing clarity before committing"] : [],
    missingInfo: ["Timeline", "Decision criteria", "Best contact channel"],
    nextBestAction: "Send a concise qualification reply and invite the lead to a discovery call.",
    draftReply: `Hi ${lead.name}, thanks for reaching out. Yes, I can help with that. A good next step is to understand your goal, timeline, and whether you want strategy only or hands-on support. Would you like me to send a short set of questions or book a quick discovery call?`,
    followUpPlan: [
      {
        label: "Send qualification reply",
        timing: "Now, after human approval",
        owner: "human"
      },
      {
        label: "Follow up if no reply",
        timing: "24 hours later",
        owner: "agent"
      }
    ],
    approvalRequired: true,
    confidence: 0.72,
    memoryUsed: selectedMemories
  };
};

export const buildTrace = (
  lead: Lead,
  result: AgentResult,
  selectedMemories: BusinessMemory[]
): TraceStep[] => [
  {
    stage: "ingest",
    title: "Captured inbound lead",
    detail: `${lead.name} arrived from ${lead.source}.`
  },
  {
    stage: "qualify",
    title: "Qualified intent and urgency",
    detail: `${result.intent}; urgency is ${result.urgency}.`
  },
  {
    stage: "retrieve-memory",
    title: "Retrieved relevant memories",
    detail: `${selectedMemories.length} memories selected within context budget.`
  },
  {
    stage: "draft-action",
    title: "Drafted sales action",
    detail: result.nextBestAction
  },
  {
    stage: "approval-gate",
    title: "Human approval required",
    detail: "Message is held for owner review before sending."
  },
  {
    stage: "learn",
    title: "Ready to learn from outcome",
    detail: "Approval, edits, or rejection will update future memory confidence."
  }
];

export const createWorkflowRun = ({
  lead,
  memories,
  result,
  provider,
  tokenUsage
}: {
  lead: Lead;
  memories: BusinessMemory[];
  result: AgentResult;
  provider: "qwen" | "fallback";
  tokenUsage: TokenUsage;
}): WorkflowRun => {
  const selectedMemories = result.memoryUsed.length ? result.memoryUsed : selectRelevantMemories(lead, memories);

  return {
    id: `run-${lead.id}-${Date.now().toString(36)}`,
    leadId: lead.id,
    status: "awaiting_approval",
    provider,
    createdAt: new Date().toISOString(),
    result,
    trace: buildTrace(lead, result, selectedMemories),
    tokenUsage
  };
};
