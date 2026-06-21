import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { join } from "node:path";
import { buildFallbackAdvisorReport, normalizeQwenAdvisorReport } from "../src/lib/advisor";
import {
  createWorkflowRun,
  buildFallbackAgentResult,
  scoreMemoryForLead,
  selectRelevantMemories
} from "../src/lib/agent";
import { callQwenChat, normalizeQwenAgentResult } from "../src/lib/qwen";
import { FileWorkflowRunStore } from "../src/lib/runStore";
import { summarizeUsage } from "../src/lib/usage";
import type { AgentRunResponse, Lead, WorkflowRun } from "../src/lib/types";
import { seedLeads, seedMemories } from "../src/data/seed";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 8787);
const runStore = new FileWorkflowRunStore(join(process.cwd(), "work", "runtime", "workflow-runs.json"));

const leads = new Map<string, Lead>(seedLeads.map((lead) => [lead.id, { ...lead }]));
const workflowRuns = new Map<string, WorkflowRun>();

const hydrateRuns = async () => {
  const persistedRuns = await runStore.list();
  for (const run of persistedRuns) {
    workflowRuns.set(run.id, run);
    const lead = leads.get(run.leadId);
    if (lead) leads.set(run.leadId, { ...lead, status: run.status });
  }
};

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    providerReady: Boolean(process.env.QWEN_API_KEY),
    model: process.env.QWEN_MODEL ?? "qwen3.7-plus"
  });
});

app.get("/api/bootstrap", (_req, res) => {
  const lead = [...leads.values()][0];
  res.json({
    leads: [...leads.values()],
    memories: seedMemories,
    memoryScores: lead
      ? seedMemories.map((memory) => ({
          memoryId: memory.id,
          score: scoreMemoryForLead(lead, memory),
          selected: selectRelevantMemories(lead, seedMemories, 4).some((item) => item.id === memory.id),
          stale: memory.confidence < 0.5
        }))
      : [],
    runs: [...workflowRuns.values()],
    usageSummary: summarizeUsage([...workflowRuns.values()])
  });
});

app.post("/api/agent/run", async (req, res) => {
  const leadId = String(req.body?.leadId ?? "");
  const lead = leads.get(leadId);

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const selectedMemories = selectRelevantMemories(lead, seedMemories, 4);
  const qwenApiKey = process.env.QWEN_API_KEY;
  const qwenBaseUrl =
    process.env.QWEN_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const qwenModel = process.env.QWEN_MODEL ?? "qwen3.7-plus";

  let run: WorkflowRun;

  if (qwenApiKey) {
    try {
      const qwen = await callQwenChat({
        apiKey: qwenApiKey,
        baseUrl: qwenBaseUrl,
        model: qwenModel,
        messages: [
          {
            role: "system",
            content:
              "You are FunnelOps Autopilot, a production-minded inbound sales agent. Return only JSON matching the requested schema. Never send final quotes without human approval."
          },
          {
            role: "user",
            content: JSON.stringify({
              task:
                "Analyze this inbound lead, retrieve relevant memory context, and propose a human-approved sales action.",
              outputSchema: {
                intent: "string",
                urgency: "low | medium | high",
                budgetSignal: "string",
                objections: ["string"],
                missingInfo: ["string"],
                nextBestAction: "string",
                draftReply: "string",
                followUpPlan: [
                  {
                    label: "string",
                    timing: "string",
                    owner: "agent | human"
                  }
                ],
                approvalRequired: "boolean",
                confidence: "number between 0 and 1"
              },
              lead,
              selectedMemories
            })
          }
        ]
      });

      const result = normalizeQwenAgentResult(qwen.content, lead, selectedMemories);
      run = createWorkflowRun({
        lead,
        memories: seedMemories,
        result,
        provider: "qwen",
        tokenUsage: qwen.usage
      });
    } catch (error) {
      console.warn("Qwen agent call fell back:", error instanceof Error ? error.message : error);
      const result = buildFallbackAgentResult(lead, selectedMemories);
      run = createWorkflowRun({
        lead,
        memories: seedMemories,
        result,
        provider: "fallback",
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      });
    }
  } else {
    const result = buildFallbackAgentResult(lead, selectedMemories);
    run = createWorkflowRun({
      lead,
      memories: seedMemories,
      result,
      provider: "fallback",
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    });
  }

  workflowRuns.set(run.id, run);
  await runStore.upsert(run);
  leads.set(lead.id, { ...lead, status: "awaiting_approval" });

  const response: AgentRunResponse = {
    lead: leads.get(lead.id)!,
    run
  };

  res.json(response);
});

app.post("/api/runs/:runId/decision", (req, res) => {
  const run = workflowRuns.get(req.params.runId);
  const decision = req.body?.decision;

  if (!run || !["approved", "rejected"].includes(decision)) {
    res.status(400).json({ error: "Invalid approval decision" });
    return;
  }

  const updatedRun: WorkflowRun = {
    ...run,
    status: decision
  };
  const lead = leads.get(run.leadId);

  workflowRuns.set(run.id, updatedRun);
  void runStore.upsert(updatedRun);
  if (lead) leads.set(lead.id, { ...lead, status: decision });

  res.json({ run: updatedRun, lead: lead ? leads.get(lead.id) : undefined });
});

app.post("/api/advisor/run", async (_req, res) => {
  const currentLeads = [...leads.values()];
  const currentRuns = [...workflowRuns.values()];
  const usageSummary = summarizeUsage(currentRuns);
  const qwenApiKey = process.env.QWEN_API_KEY;
  const qwenBaseUrl =
    process.env.QWEN_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const qwenModel = process.env.QWEN_MODEL ?? "qwen3.7-plus";

  if (qwenApiKey) {
    try {
      const qwen = await callQwenChat({
        apiKey: qwenApiKey,
        baseUrl: qwenBaseUrl,
        model: qwenModel,
        messages: [
          {
            role: "system",
            content:
              "You are FunnelOps Revenue Advisor, an AI business advisor for solo sellers. Return only JSON matching the requested schema. Give practical advice, not generic encouragement."
          },
          {
            role: "user",
            content: JSON.stringify({
              task:
                "Analyze the inbox, memories, workflow history, and token usage. Advise the owner on what to do next.",
              outputSchema: {
                topPriorityLeadId: "string",
                headline: "string",
                sourceInsight: "string",
                followUpGap: "string",
                memoryRecommendation: "string",
                riskWarning: "string",
                nextBestBusinessAction: "string",
                growthExperiment: "string",
                confidence: "number between 0 and 1"
              },
              leads: currentLeads,
              memories: seedMemories,
              workflowRuns: currentRuns,
              usageSummary
            })
          }
        ]
      });

      res.json({
        advisorRun: {
          id: `advisor-${Date.now().toString(36)}`,
          provider: "qwen",
          createdAt: new Date().toISOString(),
          report: normalizeQwenAdvisorReport(qwen.content, currentLeads, seedMemories, currentRuns),
          tokenUsage: qwen.usage
        }
      });
      return;
    } catch (error) {
      console.warn("Qwen advisor call fell back:", error instanceof Error ? error.message : error);
    }
  }

  res.json({
    advisorRun: {
      id: `advisor-${Date.now().toString(36)}`,
      provider: "fallback",
      createdAt: new Date().toISOString(),
      report: buildFallbackAdvisorReport(currentLeads, seedMemories, currentRuns),
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    }
  });
});

hydrateRuns()
  .then(() => {
    app.listen(port, () => {
      console.log(`FunnelOps API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to hydrate workflow runs", error);
    process.exit(1);
  });
