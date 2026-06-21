import { z } from "zod";
import { buildFallbackAgentResult } from "./agent";
import type { AgentResult, BusinessMemory, Lead, TokenUsage } from "./types";

const followUpSchema = z.object({
  label: z.string(),
  timing: z.string(),
  owner: z.enum(["agent", "human"])
});

const qwenResultSchema = z.object({
  intent: z.string(),
  urgency: z.enum(["low", "medium", "high"]),
  budgetSignal: z.string(),
  objections: z.array(z.string()),
  missingInfo: z.array(z.string()),
  nextBestAction: z.string(),
  draftReply: z.string(),
  followUpPlan: z.array(followUpSchema),
  approvalRequired: z.boolean(),
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

export const normalizeQwenAgentResult = (
  raw: string,
  lead: Lead,
  selectedMemories: BusinessMemory[]
): AgentResult => {
  try {
    const parsed = qwenResultSchema.parse(JSON.parse(extractJson(raw)));
    return {
      ...parsed,
      memoryUsed: selectedMemories
    };
  } catch {
    return buildFallbackAgentResult(lead, selectedMemories);
  }
};

export type QwenChatResult = {
  content: string;
  model: string;
  usage: TokenUsage;
};

type QwenChatMessage = {
  role: "system" | "user";
  content: string;
};

type QwenChatResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export const callQwenChat = async ({
  apiKey,
  baseUrl,
  model,
  messages
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: QwenChatMessage[];
}): Promise<QwenChatResult> => {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 900
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Qwen request failed with ${response.status}: ${detail.slice(0, 500)}`);
  }

  const data = (await response.json()) as QwenChatResponse;
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("Qwen response did not include message content");
  }

  return {
    content,
    model: data.model ?? model,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0
    }
  };
};
