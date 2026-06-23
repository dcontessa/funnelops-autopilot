import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  Inbox,
  MessageSquareText,
  PlayCircle,
  Send,
  ShieldCheck,
  Siren,
  Sparkles,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getLeadChannel, listLeadChannels, type LeadChannel } from "./lib/channels";
import type { UsageSummary } from "./lib/usage";
import type {
  AdvisorRun,
  AgentRunResponse,
  BusinessMemory,
  Lead,
  MemoryScore,
  WorkflowRun
} from "./lib/types";

type BootstrapPayload = {
  leads: Lead[];
  memories: BusinessMemory[];
  memoryScores: MemoryScore[];
  runs: WorkflowRun[];
  usageSummary: UsageSummary;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

const statusLabel: Record<Lead["status"], string> = {
  new: "New",
  analyzing: "Analyzing",
  awaiting_approval: "Needs approval",
  approved: "Approved",
  rejected: "Rejected"
};

type DemoTarget = "inbox" | "lead" | "memory" | "approval" | "trace" | "usage" | "advisor" | "proof";

type DemoStep = {
  id: number;
  label: string;
  title: string;
  detail: string;
  target: DemoTarget;
  cue: string;
};

const demoSteps: DemoStep[] = [
  {
    id: 1,
    label: "Lead",
    title: "Start with messy inbound demand",
    detail:
      "Show the WhatsApp-style lead. It has real buying intent, pricing risk, and follow-up pain.",
    target: "inbox",
    cue: "This is the moment solo sellers lose revenue, not because demand is missing, but because context is scattered."
  },
  {
    id: 2,
    label: "Qwen",
    title: "Run Qwen Cloud reasoning",
    detail:
      "Click Run Agent. Qwen classifies intent, urgency, missing information, and the next best action.",
    target: "lead",
    cue: "The model is not only writing. It is turning an ambiguous message into a structured workflow decision."
  },
  {
    id: 3,
    label: "Memory",
    title: "Retrieve only relevant memories",
    detail:
      "Point to pricing guardrails, ICP fit, tone preference, and human approval rules.",
    target: "memory",
    cue: "Memory makes the agent safer and more useful because it remembers business rules within a limited context window."
  },
  {
    id: 4,
    label: "Approval",
    title: "Hold important actions for the owner",
    detail:
      "Show the approval queue. Pricing, quotes, and uncertain replies do not go out automatically.",
    target: "approval",
    cue: "This is the production-readiness layer: autonomous drafting with human control at the decision point."
  },
  {
    id: 5,
    label: "Trace",
    title: "Make the agent auditable",
    detail:
      "Show the trace. Judges can see capture, qualification, memory retrieval, drafting, approval, and learning.",
    target: "trace",
    cue: "A judge should never have to guess what the agent did. The trace explains the workflow."
  },
  {
    id: 6,
    label: "Usage",
    title: "Expose Qwen Cloud usage",
    detail:
      "Show the usage ledger and token metrics. Cloud usage is visible, measurable, and budget-aware.",
    target: "usage",
    cue: "The app proves Qwen Cloud is powering the agent, and it treats token spend as part of the product."
  },
  {
    id: 7,
    label: "Advisor",
    title: "End with AI Revenue Advisor",
    detail:
      "Run or show Advisor Mode. Qwen reviews the whole inbox and recommends the next business move.",
    target: "advisor",
    cue: "The product graduates from reply assistant to revenue autopilot and advisory layer."
  }
];

const proofBadges = [
  "Qwen Cloud reasoning",
  "Persistent memory",
  "Human approval",
  "Agent trace",
  "Usage ledger",
  "Alibaba proof ready",
  "MIT license"
];

function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [memories, setMemories] = useState<BusinessMemory[]>([]);
  const [memoryScores, setMemoryScores] = useState<MemoryScore[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary>({
    totalRuns: 0,
    qwenRuns: 0,
    fallbackRuns: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  });
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<LeadChannel>("All");
  const [isRunning, setIsRunning] = useState(false);
  const [isAdvisorRunning, setIsAdvisorRunning] = useState(false);
  const [advisorRun, setAdvisorRun] = useState<AdvisorRun | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeDemoStep, setActiveDemoStep] = useState(0);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    api<BootstrapPayload>("/api/bootstrap")
      .then((payload) => {
        setLeads(payload.leads);
        setMemories(payload.memories);
        setMemoryScores(payload.memoryScores);
        setRuns(payload.runs);
        setUsageSummary(payload.usageSummary);
        setSelectedLeadId(payload.leads[0]?.id ?? "");
      })
      .catch(() => setError("Could not load demo workspace."));
  }, []);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0];
  const channels = useMemo(() => listLeadChannels(leads), [leads]);
  const filteredLeads = useMemo(
    () =>
      selectedChannel === "All"
        ? leads
        : leads.filter((lead) => getLeadChannel(lead.source) === selectedChannel),
    [leads, selectedChannel]
  );
  const latestRun = useMemo(
    () => runs.find((run) => run.leadId === selectedLead?.id),
    [runs, selectedLead?.id]
  );
  const selectedMemories = latestRun?.result.memoryUsed ?? memories.slice(0, 4);
  const currentDemoStep = demoSteps[activeDemoStep];

  const demoTargetClass = (target: DemoTarget) =>
    isDemoMode && currentDemoStep.target === target ? "demo-highlight" : "";

  const activateDemoMode = () => {
    setIsDemoMode((current) => {
      const next = !current;
      if (next) {
        setActiveDemoStep(0);
        const whatsappLead = leads.find((lead) => getLeadChannel(lead.source) === "WhatsApp");
        setSelectedChannel("WhatsApp");
        if (whatsappLead) setSelectedLeadId(whatsappLead.id);
      }
      return next;
    });
  };

  const runAgent = async () => {
    if (!selectedLead) return;

    setIsRunning(true);
    setError("");
    setLeads((current) =>
      current.map((lead) => (lead.id === selectedLead.id ? { ...lead, status: "analyzing" } : lead))
    );

    try {
      const payload = await api<AgentRunResponse>("/api/agent/run", {
        method: "POST",
        body: JSON.stringify({ leadId: selectedLead.id })
      });
      setLeads((current) =>
        current.map((lead) => (lead.id === payload.lead.id ? payload.lead : lead))
      );
      setRuns((current) => [payload.run, ...current.filter((run) => run.id !== payload.run.id)]);
      setUsageSummary((current) => ({
        totalRuns: current.totalRuns + 1,
        qwenRuns: current.qwenRuns + (payload.run.provider === "qwen" ? 1 : 0),
        fallbackRuns: current.fallbackRuns + (payload.run.provider === "fallback" ? 1 : 0),
        promptTokens: current.promptTokens + payload.run.tokenUsage.promptTokens,
        completionTokens: current.completionTokens + payload.run.tokenUsage.completionTokens,
        totalTokens: current.totalTokens + payload.run.tokenUsage.totalTokens
      }));
    } catch {
      setError("Agent run failed. Check backend logs or Qwen credentials.");
      setLeads((current) =>
        current.map((lead) => (lead.id === selectedLead.id ? { ...lead, status: "new" } : lead))
      );
    } finally {
      setIsRunning(false);
    }
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (!latestRun) return;

    const payload = await api<{ run: WorkflowRun; lead?: Lead }>(
      `/api/runs/${latestRun.id}/decision`,
      {
        method: "POST",
        body: JSON.stringify({ decision })
      }
    );
    setRuns((current) => current.map((run) => (run.id === payload.run.id ? payload.run : run)));
    if (payload.lead) {
      setLeads((current) =>
        current.map((lead) => (lead.id === payload.lead?.id ? payload.lead : lead))
      );
    }
  };

  const runAdvisor = async () => {
    setIsAdvisorRunning(true);
    setError("");

    try {
      const payload = await api<{ advisorRun: AdvisorRun }>("/api/advisor/run", {
        method: "POST",
        body: JSON.stringify({})
      });
      setAdvisorRun(payload.advisorRun);
      setUsageSummary((current) => ({
        totalRuns: current.totalRuns,
        qwenRuns: current.qwenRuns + (payload.advisorRun.provider === "qwen" ? 1 : 0),
        fallbackRuns: current.fallbackRuns + (payload.advisorRun.provider === "fallback" ? 1 : 0),
        promptTokens: current.promptTokens + payload.advisorRun.tokenUsage.promptTokens,
        completionTokens: current.completionTokens + payload.advisorRun.tokenUsage.completionTokens,
        totalTokens: current.totalTokens + payload.advisorRun.tokenUsage.totalTokens
      }));
    } catch {
      setError("Advisor run failed. Check backend logs or Qwen credentials.");
    } finally {
      setIsAdvisorRunning(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <GitBranch size={24} />
          </div>
          <div>
            <p>FunnelOps Autopilot</p>
            <span>Qwen Cloud Hackathon Vertical Slice</span>
          </div>
        </div>
        <div className="topbar-meta">
          <span>Track 4: Autopilot Agent</span>
          <span>Memory depth enabled</span>
          <span>Alibaba Cloud proof-ready backend</span>
          <button
            className={`demo-toggle ${isDemoMode ? "active" : ""}`}
            onClick={activateDemoMode}
            type="button"
          >
            <PlayCircle size={15} />
            Judge Demo
          </button>
        </div>
      </header>

      <section className="hero-band">
        <div>
          <h1>Messy inbound lead → memory-aware sales action → human approval.</h1>
          <p>
            This first slice proves the full judge story: Qwen-powered reasoning, persistent
            business memory, traceable workflow, token visibility, and a human approval gate.
          </p>
        </div>
        <button className="primary-action" onClick={runAgent} disabled={!selectedLead || isRunning}>
          <Sparkles size={18} />
          {isRunning ? "Running Qwen agent..." : "Run Agent"}
        </button>
      </section>

      <section className={`proof-badge-strip ${demoTargetClass("proof")}`} aria-label="Hackathon proof badges">
        {proofBadges.map((badge) => (
          <span key={badge}>
            <CheckCircle2 size={15} />
            {badge}
          </span>
        ))}
      </section>

      {error && <div className="error-banner">{error}</div>}

      {isDemoMode && (
        <section className="demo-command-panel">
          <div className="demo-command-copy">
            <span>Judge Demo Mode</span>
            <h2>{currentDemoStep.title}</h2>
            <p>{currentDemoStep.detail}</p>
            <blockquote>{currentDemoStep.cue}</blockquote>
          </div>
          <div className="demo-step-list">
            {demoSteps.map((step, index) => (
              <button
                className={index === activeDemoStep ? "active" : ""}
                key={step.id}
                onClick={() => setActiveDemoStep(index)}
                type="button"
              >
                <strong>{step.id}</strong>
                <span>{step.label}</span>
              </button>
            ))}
          </div>
          <div className="demo-command-actions">
            <button
              disabled={activeDemoStep === 0}
              onClick={() => setActiveDemoStep((step) => Math.max(0, step - 1))}
              type="button"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <button
              disabled={activeDemoStep === demoSteps.length - 1}
              onClick={() => setActiveDemoStep((step) => Math.min(demoSteps.length - 1, step + 1))}
              type="button"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      <section className="workspace-grid">
        <aside className={`panel inbox-panel ${demoTargetClass("inbox")}`}>
          <PanelTitle icon={<Inbox size={18} />} title="Inbound Inbox" detail="Seeded demo leads" />
          <div className="channel-filter" aria-label="Lead source filters">
            {channels.map((channel) => (
              <button
                className={channel === selectedChannel ? "active" : ""}
                key={channel}
                onClick={() => {
                  setSelectedChannel(channel);
                  const nextLead =
                    channel === "All"
                      ? leads[0]
                      : leads.find((lead) => getLeadChannel(lead.source) === channel);
                  if (nextLead) setSelectedLeadId(nextLead.id);
                }}
              >
                {channel}
              </button>
            ))}
          </div>
          <div className="lead-list">
            {filteredLeads.map((lead) => (
              <button
                className={`lead-row ${lead.id === selectedLead?.id ? "selected" : ""}`}
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
              >
                <span className="lead-row-header">
                  <strong>{lead.name}</strong>
                  <em>{statusLabel[lead.status]}</em>
                </span>
                <span>{lead.source}</span>
                <p>{lead.message}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className={`panel lead-panel ${demoTargetClass("lead")} ${demoTargetClass("memory")}`}>
          <PanelTitle
            icon={<MessageSquareText size={18} />}
            title="Selected Lead"
            detail={selectedLead?.source ?? "No lead selected"}
          />
          {selectedLead && (
            <div className="lead-detail">
              <div className="lead-card-header">
                <div>
                  <h2>{selectedLead.name}</h2>
                  <span>{new Date(selectedLead.receivedAt).toLocaleString()}</span>
                </div>
                <strong className={`status-chip status-${selectedLead.status}`}>
                  {statusLabel[selectedLead.status]}
                </strong>
              </div>
              <p>{selectedLead.message}</p>
            </div>
          )}

          <div className="memory-strip">
            <PanelTitle
              icon={<Database size={18} />}
              title="Retrieved Memories"
              detail="Importance + recency + confidence"
            />
            <div className="memory-list">
              {selectedMemories.map((memory) => (
                <article key={memory.id} className="memory-card">
                  <h3>{memory.title}</h3>
                  <p>{memory.content}</p>
                  <span>
                    {Math.round(memory.importance * 100)} importance ·{" "}
                    {Math.round(memory.confidence * 100)} confidence
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`panel result-panel ${demoTargetClass("approval")}`}>
          <PanelTitle
            icon={<ShieldCheck size={18} />}
            title="Approval Queue"
            detail={latestRun ? latestRun.provider.toUpperCase() : "Awaiting run"}
          />
          {latestRun ? (
            <div className="result-stack">
              <div className="agent-summary">
                <div>
                  <span>Intent</span>
                  <strong>{latestRun.result.intent}</strong>
                </div>
                <div>
                  <span>Urgency</span>
                  <strong>{latestRun.result.urgency}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{Math.round(latestRun.result.confidence * 100)}%</strong>
                </div>
              </div>

              <section className="draft-box">
                <span>Draft reply</span>
                <p>{latestRun.result.draftReply}</p>
              </section>

              <section className="next-action">
                <span>Next best action</span>
                <p>{latestRun.result.nextBestAction}</p>
              </section>

              <div className="approval-actions">
                <button onClick={() => decide("approved")} disabled={latestRun.status !== "awaiting_approval"}>
                  <CheckCircle2 size={17} />
                  Approve
                </button>
                <button onClick={() => decide("rejected")} disabled={latestRun.status !== "awaiting_approval"}>
                  <XCircle size={17} />
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </section>

      <section className="lower-grid">
        <section className={`panel trace-panel ${demoTargetClass("trace")}`}>
          <PanelTitle icon={<Activity size={18} />} title="Agent Trace" detail="Judge-visible workflow" />
          <div className="trace-list">
            {(latestRun?.trace ?? []).map((step, index) => (
              <article key={step.stage} className="trace-step">
                <strong>{index + 1}</strong>
                <div>
                  <span>{step.title}</span>
                  <p>{step.detail}</p>
                </div>
              </article>
            ))}
            {!latestRun && <p className="muted">Run the agent to generate a trace.</p>}
          </div>
        </section>

        <section className={`panel token-panel ${demoTargetClass("usage")}`}>
          <PanelTitle icon={<Clock3 size={18} />} title="Token + Control Metrics" detail="Budget guardrail" />
          <div className="metric-grid">
            <Metric label="Prompt tokens" value={latestRun?.tokenUsage.promptTokens ?? 0} />
            <Metric label="Completion tokens" value={latestRun?.tokenUsage.completionTokens ?? 0} />
            <Metric label="Total tokens" value={latestRun?.tokenUsage.totalTokens ?? 0} />
            <Metric label="Follow-ups" value={latestRun?.result.followUpPlan.length ?? 0} />
          </div>
          <div className="proof-note">
            <Send size={16} />
            Qwen calls run server-side. API key never reaches the browser.
          </div>
        </section>
      </section>

      <section className={`panel advisor-panel ${demoTargetClass("advisor")}`}>
        <PanelTitle
          icon={<Siren size={18} />}
          title="AI Revenue Advisor"
          detail={advisorRun ? advisorRun.provider.toUpperCase() : "Whole-inbox advisory"}
        />
        <div className="advisor-layout">
          <div className="advisor-copy">
            {advisorRun ? (
              <>
                <h2>{advisorRun.report.headline}</h2>
                <p>{advisorRun.report.nextBestBusinessAction}</p>
                <div className="advisor-grid">
                  <AdvisorItem label="Source insight" value={advisorRun.report.sourceInsight} />
                  <AdvisorItem label="Follow-up gap" value={advisorRun.report.followUpGap} />
                  <AdvisorItem label="Memory recommendation" value={advisorRun.report.memoryRecommendation} />
                  <AdvisorItem label="Risk warning" value={advisorRun.report.riskWarning} />
                  <AdvisorItem label="Growth experiment" value={advisorRun.report.growthExperiment} />
                  <AdvisorItem
                    label="Advisor confidence"
                    value={`${Math.round(advisorRun.report.confidence * 100)}%`}
                  />
                </div>
              </>
            ) : (
              <>
                <h2>Ask Qwen to advise across the whole inbox.</h2>
                <p>
                  Advisor Mode looks beyond one lead. It reviews sources, memories, workflow
                  history, approval bottlenecks, and token usage to recommend the next business move.
                </p>
              </>
            )}
          </div>
          <button className="primary-action advisor-action" onClick={runAdvisor} disabled={isAdvisorRunning}>
            <Sparkles size={18} />
            {isAdvisorRunning ? "Running Advisor..." : "Run Advisor"}
          </button>
        </div>
      </section>

      <section className="panel memory-ops-panel">
        <PanelTitle
          icon={<Database size={18} />}
          title="Memory Operations"
          detail={`${runs.length} persisted workflow run${runs.length === 1 ? "" : "s"}`}
        />
        <div className="memory-ops-grid">
          {memories.map((memory) => {
            const score = memoryScores.find((item) => item.memoryId === memory.id);
            const selected = latestRun
              ? latestRun.result.memoryUsed.some((item) => item.id === memory.id)
              : score?.selected;

            return (
              <article className={`memory-ops-card ${selected ? "memory-selected" : ""}`} key={memory.id}>
                <div>
                  <h3>{memory.title}</h3>
                  <span>{selected ? "Selected for context" : score?.stale ? "Downgraded / stale" : "Available"}</span>
                </div>
                <div className="score-bar" aria-label={`Memory score ${score?.score ?? 0}`}>
                  <i style={{ width: `${Math.round((score?.score ?? 0) * 100)}%` }} />
                </div>
                <p>{memory.tags.join(" · ")}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`panel qwen-usage-panel ${demoTargetClass("usage")}`}>
        <PanelTitle
          icon={<Sparkles size={18} />}
          title="Qwen Cloud Usage Ledger"
          detail="Credit usage evidence"
        />
        <div className="usage-ledger-grid">
          <Metric label="Qwen runs" value={usageSummary.qwenRuns} />
          <Metric label="Fallback runs" value={usageSummary.fallbackRuns} />
          <Metric label="Prompt tokens" value={usageSummary.promptTokens} />
          <Metric label="Completion tokens" value={usageSummary.completionTokens} />
          <Metric label="Total tokens" value={usageSummary.totalTokens} />
          <Metric label="Workflow runs" value={usageSummary.totalRuns} />
        </div>
        <div className="proof-note">
          <Sparkles size={16} />
          This ledger is calculated from persisted workflow runs so judges can see Qwen Cloud is
          actively powering the agent.
        </div>
      </section>

      <section className="panel integration-panel">
        <PanelTitle
          icon={<MessageSquareText size={18} />}
          title="Channel Integration Notes"
          detail="Demo now, production later"
        />
        <div className="integration-grid">
          <article>
            <strong>WhatsApp-style demo input</strong>
            <p>
              The current build safely simulates WhatsApp inquiries so the hackathon demo can prove
              the agent workflow without waiting on Meta onboarding.
            </p>
          </article>
          <article>
            <strong>Production path</strong>
            <p>
              Future integration should use WhatsApp Business Platform webhooks, server-side tokens,
              Phone Number ID, WABA ID, and human approval before sending quotes or commitments.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

function PanelTitle({
  icon,
  title,
  detail
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="panel-title">
      <div>
        {icon}
        <strong>{title}</strong>
      </div>
      <span>{detail}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}

function AdvisorItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="advisor-item">
      <span>{label}</span>
      <p>{value}</p>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <Sparkles size={28} />
      <strong>No agent run yet</strong>
      <p>Select a lead and run the agent to create a draft, trace, and approval decision.</p>
    </div>
  );
}

export default App;
