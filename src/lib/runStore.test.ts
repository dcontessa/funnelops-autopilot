import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileWorkflowRunStore } from "./runStore";
import type { WorkflowRun } from "./types";

let tempDir = "";

const run: WorkflowRun = {
  id: "run-test",
  leadId: "lead-001",
  status: "awaiting_approval",
  provider: "qwen",
  createdAt: "2026-06-20T10:00:00.000Z",
  tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  trace: [],
  result: {
    intent: "Quote request",
    urgency: "medium",
    budgetSignal: "Asked for pricing",
    objections: [],
    missingInfo: [],
    nextBestAction: "Ask qualification question",
    draftReply: "Hi there",
    followUpPlan: [],
    approvalRequired: true,
    confidence: 0.9,
    memoryUsed: []
  }
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "funnelops-store-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("FileWorkflowRunStore", () => {
  it("returns an empty list when the store file does not exist", async () => {
    const store = new FileWorkflowRunStore(join(tempDir, "runs.json"));

    await expect(store.list()).resolves.toEqual([]);
  });

  it("persists workflow runs and reloads them from disk", async () => {
    const path = join(tempDir, "nested", "runs.json");
    const store = new FileWorkflowRunStore(path);

    await store.upsert(run);

    const nextStore = new FileWorkflowRunStore(path);
    await expect(nextStore.list()).resolves.toEqual([run]);
  });

  it("updates an existing run instead of duplicating it", async () => {
    const store = new FileWorkflowRunStore(join(tempDir, "runs.json"));

    await store.upsert(run);
    await store.upsert({ ...run, status: "approved" });

    const runs = await store.list();
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("approved");
  });
});
