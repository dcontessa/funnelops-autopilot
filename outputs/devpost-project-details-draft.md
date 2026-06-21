# FunnelOps Autopilot Devpost Draft

## Project name

FunnelOps Autopilot

## Elevator pitch

Qwen-powered inbound sales autopilot that turns messy leads into memory-aware replies, follow-ups, and human-approved sales actions.

## About the project

## Inspiration

Solo founders, creators, consultants, and small service businesses often do not lose leads because demand is missing. They lose leads because interest arrives everywhere: Instagram DMs, WhatsApp chats, LinkedIn comments, web forms, email, and referrals. The owner has to remember pricing rules, past context, buyer intent, objections, follow-up timing, and what should or should not be automated.

FunnelOps Autopilot was built for that gap: a lightweight inbound sales command center for people who have real demand but no sales team.

## What it does

FunnelOps Autopilot turns messy inbound leads into structured sales actions.

- Captures leads from multiple simulated channels including Instagram DM, website form, LinkedIn comment, and WhatsApp-style chat.
- Uses Qwen Cloud through a backend API to classify intent, urgency, budget signal, objections, and missing information.
- Retrieves relevant business memories such as pricing guardrails, owner tone preference, ICP rules, and human approval rules.
- Drafts a reply and follow-up plan.
- Routes important messages through a human approval queue before action is treated as complete.
- Shows an agent trace so users can see how the system captured, qualified, retrieved memory, drafted, gated, and learned.
- Tracks token usage and Qwen run history in a usage ledger.
- Adds AI Revenue Advisor mode, where Qwen analyzes the whole inbox, workflow history, memories, and token usage to recommend the next business move.

## How we used Qwen Cloud

Qwen Cloud is the reasoning and advisory engine behind the backend. The app uses Qwen Cloud for:

- lead classification
- memory-aware sales reasoning
- reply drafting
- next-best-action planning
- follow-up recommendations
- AI Revenue Advisor analysis
- structured JSON output for traceable product workflows

The frontend never receives the Qwen API key. The React dashboard calls our backend, and the backend calls Qwen Cloud using the OpenAI-compatible endpoint.

We also made Qwen usage visible inside the product. The dashboard shows Qwen runs, fallback runs, prompt tokens, completion tokens, total tokens, workflow runs, and per-run token metrics. This makes cost and cloud usage part of the agent workflow rather than hidden infrastructure.

## Memory and human-in-the-loop design

FunnelOps is not a one-shot prompt wrapper. It includes a memory layer that scores memories by importance, confidence, freshness, and relevance. Stale memories are downgraded so the agent does not blindly retrieve expired promotions or outdated rules.

The approval queue is the human-in-the-loop checkpoint. Quotes, pricing, commitments, or uncertain responses require owner approval before being treated as ready.

## AI advisory layer

Beyond drafting replies, FunnelOps includes AI Revenue Advisor mode. The advisor reviews the broader inbox, sources, workflow history, memories, and token usage, then recommends which lead to prioritize, where follow-up is blocked, what memory should be updated, and what growth experiment to run next.

This turns the product from an AI reply assistant into an inbound sales autopilot plus advisory layer.

## Built with

- Qwen Cloud / Alibaba Cloud Model Studio
- Qwen3.7-Plus
- OpenAI-compatible Qwen API endpoint
- React
- TypeScript
- Vite
- Node.js
- Express
- Vitest
- Zod
- Lucide React
- Local file-backed workflow persistence
- Alibaba Cloud deployment planned for backend proof

## Challenges

The main challenge was keeping the product focused. It would be easy to build a generic CRM, AI SDR, or chatbot. Instead, we narrowed the product around inbound lead handling for solo sellers: capture, classify, retrieve memory, draft, approve, trace, and learn.

Another challenge was using Qwen Cloud meaningfully without wasting tokens. We added token visibility and usage ledger features so cloud usage becomes part of the product and judging story.

## Accomplishments

- Live Qwen Cloud API smoke test passed.
- Live UI calls to Qwen Cloud verified.
- WhatsApp-style lead scenario added.
- Memory operations panel implemented.
- AI Revenue Advisor mode added.
- Usage ledger added to show Qwen Cloud credit usage.
- Automated tests and production build pass.
- Notion command center tracks strategy, visuals, QA, and submission progress.

## What we learned

The strongest AI agent demos are not just about generating text. They need context, memory discipline, human control, traceability, and a real workflow. Qwen Cloud is useful here because it can reason over structured lead context, memories, workflow history, and business rules to produce both tactical actions and strategic advice.

## What is next

- Deploy backend on Alibaba Cloud for proof.
- Publish public GitHub repository with MIT license.
- Add architecture diagram to the repo.
- Record 3-minute demo video.
- Add document-to-memory onboarding.
- Add screenshot lead capture for WhatsApp/Instagram conversations.
- Expand toward real WhatsApp Business Platform integration after the hackathon.

