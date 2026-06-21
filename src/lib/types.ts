export type LeadStatus = "new" | "analyzing" | "awaiting_approval" | "approved" | "rejected";

export type Lead = {
  id: string;
  name: string;
  source: string;
  receivedAt: string;
  message: string;
  status: LeadStatus;
};

export type BusinessMemory = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  importance: number;
  confidence: number;
  updatedAt: string;
};

export type FollowUpAction = {
  label: string;
  timing: string;
  owner: "agent" | "human";
};

export type AgentResult = {
  intent: string;
  urgency: "low" | "medium" | "high";
  budgetSignal: string;
  objections: string[];
  missingInfo: string[];
  nextBestAction: string;
  draftReply: string;
  followUpPlan: FollowUpAction[];
  approvalRequired: boolean;
  confidence: number;
  memoryUsed: BusinessMemory[];
};

export type TraceStage =
  | "ingest"
  | "qualify"
  | "retrieve-memory"
  | "draft-action"
  | "approval-gate"
  | "learn";

export type TraceStep = {
  stage: TraceStage;
  title: string;
  detail: string;
};

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type WorkflowRun = {
  id: string;
  leadId: string;
  status: "awaiting_approval" | "approved" | "rejected";
  provider: "qwen" | "fallback";
  createdAt: string;
  result: AgentResult;
  trace: TraceStep[];
  tokenUsage: TokenUsage;
};

export type MemoryScore = {
  memoryId: string;
  score: number;
  selected: boolean;
  stale: boolean;
};

export type AgentRunPayload = {
  leadId: string;
};

export type AgentRunResponse = {
  lead: Lead;
  run: WorkflowRun;
};

export type AdvisorReport = {
  topPriorityLeadId: string;
  headline: string;
  sourceInsight: string;
  followUpGap: string;
  memoryRecommendation: string;
  riskWarning: string;
  nextBestBusinessAction: string;
  growthExperiment: string;
  confidence: number;
};

export type AdvisorRun = {
  id: string;
  provider: "qwen" | "fallback";
  createdAt: string;
  report: AdvisorReport;
  tokenUsage: TokenUsage;
};
