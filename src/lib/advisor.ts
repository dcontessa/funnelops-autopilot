import { z } from "zod";
import type { AdvisorReport, BusinessMemory, Lead, WorkflowRun } from "./types";

const advisorSchema = z.object({
  topPriorityLeadId: z.string(),
  headline: z.string(),
  sourceInsight: z.string(),
  followUpGap: z.string(),
  memoryRecommendation: z.string(),
  riskWarning: z.string(),
  nextBestBusinessAction: z.string(),
  growthExperiment: z.string(),
  confidence: z.number().min(0).max(1)
});

const extractJson = (raw: string) => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) return raw.slice(first, last + 1);

  return raw;
};

export const buildFallbackAdvisorReport = (
  leads: Lead[],
  memories: BusinessMemory[],
  runs: WorkflowRun[]
): AdvisorReport => {
  const awaitingApproval = leads.find((lead) => lead.status === "awaiting_approval");
  const firstNew = leads.find((lead) => lead.status === "new");
  const topLead = awaitingApproval ?? firstNew ?? leads[0];
  const staleMemory = memories.find((memory) => memory.confidence < 0.5);
  const qwenRuns = runs.filter((run) => run.provider === "qwen").length;

  return {
    topPriorityLeadId: topLead?.id ?? "",
    headline: awaitingApproval
      ? "Resolve approval bottlenecks before adding more automation."
      : "Prioritize the newest high-fit inbound lead.",
    sourceInsight:
      "Social and WhatsApp-style inquiries are the clearest channels for fast-response value.",
    followUpGap:
      runs.length === 0
        ? "No completed workflow history yet. Run the agent on two to three lead sources."
        : "Review approved runs and convert draft follow-ups into next actions.",
    memoryRecommendation: staleMemory
      ? `Review or retire stale memory: ${staleMemory.title}.`
      : "Keep pricing, approval, tone, and ICP memories active for context selection.",
    riskWarning:
      "Do not send pricing, discounts, or commitments without human approval.",
    nextBestBusinessAction: topLead
      ? `Handle ${topLead.name} first, then compare source quality across the remaining leads.`
      : "Add a lead before running Advisor Mode.",
    growthExperiment:
      "Test a WhatsApp-first follow-up template for service-business inquiries this week.",
    confidence: qwenRuns > 0 ? 0.74 : 0.62
  };
};

export const normalizeQwenAdvisorReport = (
  raw: string,
  leads: Lead[],
  memories: BusinessMemory[],
  runs: WorkflowRun[]
): AdvisorReport => {
  try {
    const parsed = advisorSchema.parse(JSON.parse(extractJson(raw)));
    return parsed;
  } catch {
    return buildFallbackAdvisorReport(leads, memories, runs);
  }
};
