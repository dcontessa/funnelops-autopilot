import json
import os
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
if not DIST.exists():
    DIST = ROOT.parent / "dist"
PORT = int(os.getenv("PORT", "8787"))
RUNS = {}

LEADS = [
    {
        "id": "lead-001",
        "name": "Alicia Tan",
        "source": "Instagram DM",
        "receivedAt": "2026-06-20T06:32:00.000Z",
        "message": "Hi, I saw your post about launch strategy. I run a small skincare clinic and need help turning IG inquiries into bookings. Do you do this and what would it cost?",
        "status": "new",
    },
    {
        "id": "lead-002",
        "name": "Marcus Lee",
        "source": "Website form",
        "receivedAt": "2026-06-20T06:45:00.000Z",
        "message": "We are a 4-person design agency. Leads come from referrals but we keep forgetting follow-ups. Can your AI help qualify and draft replies before we send them?",
        "status": "new",
    },
    {
        "id": "lead-003",
        "name": "Nadia Rahman",
        "source": "LinkedIn comment",
        "receivedAt": "2026-06-20T07:05:00.000Z",
        "message": "This is exactly my problem. I sell B2B consulting and have calls scattered across LinkedIn, email, and WhatsApp. Need something lightweight, not a huge CRM.",
        "status": "new",
    },
    {
        "id": "lead-004",
        "name": "Mei Ling",
        "source": "WhatsApp-style chat",
        "receivedAt": "2026-06-20T07:20:00.000Z",
        "message": "Hi Dr Caroline, I saw your IG. Can your AI help me reply faster to customers on WhatsApp and not forget follow-ups? How much is setup?",
        "status": "new",
    },
]

MEMORIES = [
    {
        "id": "mem-pricing",
        "title": "Pricing guardrail",
        "content": "Never send a final quote without human approval. Discovery calls are free. Strategy sprint starts at $1,500.",
        "tags": ["pricing", "quote", "approval"],
        "importance": 0.95,
        "confidence": 0.92,
        "updatedAt": "2026-06-20T05:30:00.000Z",
    },
    {
        "id": "mem-tone",
        "title": "Owner tone preference",
        "content": "Replies should be warm, concise, specific to the lead, and end with one clear question or next step.",
        "tags": ["tone", "reply", "owner-preference"],
        "importance": 0.78,
        "confidence": 0.88,
        "updatedAt": "2026-06-19T11:00:00.000Z",
    },
    {
        "id": "mem-icp",
        "title": "Best-fit customer",
        "content": "Best early users are solo service sellers, creator-consultants, boutique agencies, and local service operators with real inbound demand but no sales team.",
        "tags": ["icp", "qualification", "fit"],
        "importance": 0.91,
        "confidence": 0.86,
        "updatedAt": "2026-06-20T04:00:00.000Z",
    },
    {
        "id": "mem-approval",
        "title": "Human approval rule",
        "content": "Require owner approval for quotes, discounts, commitments, high-value leads, uncertain requests, or messages mentioning pricing.",
        "tags": ["approval", "risk", "pricing"],
        "importance": 0.97,
        "confidence": 0.90,
        "updatedAt": "2026-06-18T09:20:00.000Z",
    },
    {
        "id": "mem-stale-webinar",
        "title": "Retired webinar promo",
        "content": "The old February webinar promo is expired and should not be recommended.",
        "tags": ["expired", "webinar"],
        "importance": 0.70,
        "confidence": 0.24,
        "updatedAt": "2026-02-01T10:00:00.000Z",
    },
]


def json_response(handler, data, status=200):
    body = json.dumps(data).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,HEAD,OPTIONS,PATCH")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def memory_scores(lead):
    terms = set((lead["message"] + " " + lead["source"]).lower().replace(",", " ").split())
    scores = []
    for memory in MEMORIES:
        tag_hits = sum(1 for tag in memory["tags"] if tag.lower() in terms or tag.lower() in lead["message"].lower())
        text_hit = any(word in memory["content"].lower() for word in terms if len(word) > 4)
        score = min(1, memory["importance"] * 0.55 + memory["confidence"] * 0.25 + tag_hits * 0.08 + (0.08 if text_hit else 0))
        scores.append({"memoryId": memory["id"], "score": round(score, 2), "selected": score >= 0.62, "stale": memory["confidence"] < 0.5})
    return scores


def selected_memories(lead):
    scored = memory_scores(lead)
    by_id = {item["memoryId"]: item for item in scored}
    return sorted(MEMORIES, key=lambda item: by_id[item["id"]]["score"], reverse=True)[:4]


def fallback_agent(lead, memories):
    pricing = "cost" in lead["message"].lower() or "setup" in lead["message"].lower() or "quote" in lead["message"].lower()
    return {
        "intent": "Inbound sales inquiry for AI-assisted lead response and follow-up workflow",
        "urgency": "high" if pricing else "medium",
        "budgetSignal": "Pricing or setup cost mentioned" if pricing else "Budget not stated yet",
        "objections": ["Wants lightweight workflow, not a heavy CRM"],
        "missingInfo": ["Current lead volume", "Main channels", "Approval rules", "Desired next step"],
        "nextBestAction": "Draft a warm qualification reply and ask one clear scheduling question.",
        "draftReply": f"Hi {lead['name'].split()[0]}, yes, this is exactly the kind of messy inbound workflow FunnelOps helps with. I can help capture the inquiry, remember context, draft the reply, and keep pricing or commitments behind approval. What channel is currently creating the most missed follow-ups?",
        "followUpPlan": [
            {"label": "Send qualification reply after approval", "timing": "Now", "owner": "human"},
            {"label": "If no reply, follow up with a simple booking prompt", "timing": "24 hours", "owner": "agent"},
        ],
        "approvalRequired": True,
        "confidence": 0.82,
        "memoryUsed": memories,
    }


def qwen_json(system, payload, fallback):
    api_key = os.getenv("QWEN_API_KEY", "")
    if not api_key:
        return fallback, {"promptTokens": 0, "completionTokens": 0, "totalTokens": 0}, "fallback"

    configured_base = os.getenv("QWEN_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").rstrip("/")
    model = os.getenv("QWEN_MODEL", "qwen3.7-plus")
    models = [model]
    for candidate in ["qwen-plus", "qwen-turbo"]:
        if candidate not in models:
            models.append(candidate)
    base_urls = [configured_base]
    regional_base = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    if configured_base != regional_base:
        base_urls.append(regional_base)

    last_error = "unknown"
    for base_url in base_urls:
        for candidate_model in models:
            body = json.dumps({
                "model": candidate_model,
                "messages": [
                    {"role": "system", "content": f"{system} Return one valid JSON object and no markdown."},
                    {"role": "user", "content": json.dumps(payload)},
                ],
                "temperature": 0.2,
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{base_url}/chat/completions",
                data=body,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=6) as res:
                    data = json.loads(res.read().decode("utf-8"))
                content = data["choices"][0]["message"]["content"].strip()
                if content.startswith("```"):
                    content = content.strip("`")
                    content = content.removeprefix("json").strip()
                parsed = json.loads(content)
                usage = data.get("usage", {})
                parsed["providerEndpoint"] = base_url
                parsed["providerModel"] = candidate_model
                return parsed, {
                    "promptTokens": usage.get("prompt_tokens", 0),
                    "completionTokens": usage.get("completion_tokens", 0),
                    "totalTokens": usage.get("total_tokens", 0),
                }, "qwen"
            except urllib.error.HTTPError as exc:
                last_error = f"HTTPError {exc.code} with {candidate_model} via {base_url}"
            except Exception as exc:
                last_error = f"{type(exc).__name__} with {candidate_model} via {base_url}"

    fallback["providerNote"] = f"Qwen Cloud call fell back during demo runtime: {last_error}"
    return fallback, {"promptTokens": 0, "completionTokens": 0, "totalTokens": 0}, "fallback"


def make_run(lead, result, usage, provider):
    run = {
        "id": f"run-{int(time.time() * 1000)}",
        "leadId": lead["id"],
        "status": "awaiting_approval",
        "provider": provider,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "result": result,
        "trace": [
            {"stage": "ingest", "title": "Lead captured", "detail": f"Captured from {lead['source']}."},
            {"stage": "qualify", "title": "Intent classified", "detail": result.get("intent", "Lead intent classified.")},
            {"stage": "retrieve-memory", "title": "Memory selected", "detail": "Relevant owner rules and stale memory policy applied."},
            {"stage": "draft-action", "title": "Action drafted", "detail": result.get("nextBestAction", "Next action drafted.")},
            {"stage": "approval-gate", "title": "Approval required", "detail": "Human approval required before sending pricing or commitments."},
            {"stage": "learn", "title": "Outcome logged", "detail": "Run stored for future decisions."},
        ],
        "tokenUsage": usage,
    }
    RUNS[run["id"]] = run
    lead["status"] = "awaiting_approval"
    return run


class Handler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        if self.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()

    def do_OPTIONS(self):
        json_response(self, {})

    def do_GET(self):
        if self.path == "/api/health":
            json_response(self, {"ok": True, "providerReady": bool(os.getenv("QWEN_API_KEY")), "model": os.getenv("QWEN_MODEL", "qwen3.7-plus")})
            return
        if self.path == "/api/bootstrap":
            lead = LEADS[0]
            runs = list(RUNS.values())
            total = sum(run["tokenUsage"].get("totalTokens", 0) for run in runs)
            json_response(self, {"leads": LEADS, "memories": MEMORIES, "memoryScores": memory_scores(lead), "runs": runs, "usageSummary": {"runs": len(runs), "totalTokens": total, "qwenRuns": sum(1 for run in runs if run["provider"] == "qwen"), "fallbackRuns": sum(1 for run in runs if run["provider"] == "fallback")}})
            return
        self.serve_static()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        if self.path == "/api/agent/run":
            lead = next((item for item in LEADS if item["id"] == payload.get("leadId")), None)
            if not lead:
                json_response(self, {"error": "Lead not found"}, 404)
                return
            memories = selected_memories(lead)
            fallback = fallback_agent(lead, memories)
            result, usage, provider = qwen_json("You are FunnelOps Autopilot. Return only JSON for an inbound sales workflow. Never send final quotes without human approval.", {"lead": lead, "selectedMemories": memories, "outputSchema": fallback}, fallback)
            result.setdefault("memoryUsed", memories)
            run = make_run(lead, result, usage, provider)
            json_response(self, {"lead": lead, "run": run})
            return
        if self.path == "/api/advisor/run":
            fallback = {
                "topPriorityLeadId": "lead-004",
                "headline": "WhatsApp and Instagram leads are the fastest proof path.",
                "sourceInsight": "Messy inbound channels create the clearest before and after story.",
                "followUpGap": "Pricing questions need fast replies but owner approval.",
                "memoryRecommendation": "Keep pricing guardrails and stale campaign memories visible.",
                "riskWarning": "Avoid sending quotes or commitments without human approval.",
                "nextBestBusinessAction": "Run the WhatsApp-style lead and approve the drafted reply.",
                "growthExperiment": "Test one creator-consultant funnel with WhatsApp follow-up reminders.",
                "confidence": 0.84,
            }
            report, usage, provider = qwen_json("You are FunnelOps Revenue Advisor. Return only JSON.", {"leads": LEADS, "memories": MEMORIES, "workflowRuns": list(RUNS.values()), "outputSchema": fallback}, fallback)
            json_response(self, {"advisorRun": {"id": f"advisor-{int(time.time() * 1000)}", "provider": provider, "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "report": report, "tokenUsage": usage}})
            return
        if self.path.startswith("/api/runs/") and self.path.endswith("/decision"):
            run_id = self.path.split("/")[3]
            decision = payload.get("decision")
            run = RUNS.get(run_id)
            if not run or decision not in ["approved", "rejected"]:
                json_response(self, {"error": "Invalid approval decision"}, 400)
                return
            run["status"] = decision
            lead = next((item for item in LEADS if item["id"] == run["leadId"]), None)
            if lead:
                lead["status"] = decision
            json_response(self, {"run": run, "lead": lead})
            return
        json_response(self, {"error": "Not found"}, 404)

    def serve_static(self):
        path = self.path.split("?", 1)[0].lstrip("/")
        file_path = DIST / path if path else DIST / "index.html"
        if not file_path.exists() or file_path.is_dir():
            file_path = DIST / "index.html"
        content_type = "text/html"
        if file_path.suffix == ".js":
            content_type = "application/javascript"
        elif file_path.suffix == ".css":
            content_type = "text/css"
        body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
