import type { BusinessMemory, Lead } from "../lib/types";

export const seedLeads: Lead[] = [
  {
    id: "lead-001",
    name: "Alicia Tan",
    source: "Instagram DM",
    receivedAt: "2026-06-20T06:32:00.000Z",
    message:
      "Hi, I saw your post about launch strategy. I run a small skincare clinic and need help turning IG inquiries into bookings. Do you do this and what would it cost?",
    status: "new"
  },
  {
    id: "lead-002",
    name: "Marcus Lee",
    source: "Website form",
    receivedAt: "2026-06-20T06:45:00.000Z",
    message:
      "We are a 4-person design agency. Leads come from referrals but we keep forgetting follow-ups. Can your AI help qualify and draft replies before we send them?",
    status: "new"
  },
  {
    id: "lead-003",
    name: "Nadia Rahman",
    source: "LinkedIn comment",
    receivedAt: "2026-06-20T07:05:00.000Z",
    message:
      "This is exactly my problem. I sell B2B consulting and have calls scattered across LinkedIn, email, and WhatsApp. Need something lightweight, not a huge CRM.",
    status: "new"
  },
  {
    id: "lead-004",
    name: "Mei Ling",
    source: "WhatsApp-style chat",
    receivedAt: "2026-06-20T07:20:00.000Z",
    message:
      "Hi Dr Caroline, I saw your IG. Can your AI help me reply faster to customers on WhatsApp and not forget follow-ups? How much is setup?",
    status: "new"
  }
];

export const seedMemories: BusinessMemory[] = [
  {
    id: "mem-pricing",
    title: "Pricing guardrail",
    content:
      "Never send a final quote without human approval. Discovery calls are free. Strategy sprint starts at $1,500.",
    tags: ["pricing", "quote", "approval"],
    importance: 0.95,
    confidence: 0.92,
    updatedAt: "2026-06-20T05:30:00.000Z"
  },
  {
    id: "mem-tone",
    title: "Owner tone preference",
    content:
      "Replies should be warm, concise, specific to the lead, and end with one clear question or next step.",
    tags: ["tone", "reply", "owner-preference"],
    importance: 0.78,
    confidence: 0.88,
    updatedAt: "2026-06-19T11:00:00.000Z"
  },
  {
    id: "mem-icp",
    title: "Best-fit customer",
    content:
      "Best early users are solo service sellers, creator-consultants, boutique agencies, and local service operators with real inbound demand but no sales team.",
    tags: ["icp", "qualification", "fit"],
    importance: 0.91,
    confidence: 0.86,
    updatedAt: "2026-06-20T04:00:00.000Z"
  },
  {
    id: "mem-approval",
    title: "Human approval rule",
    content:
      "Require owner approval for quotes, discounts, commitments, high-value leads, uncertain requests, or messages mentioning pricing.",
    tags: ["approval", "risk", "pricing"],
    importance: 0.97,
    confidence: 0.9,
    updatedAt: "2026-06-18T09:20:00.000Z"
  },
  {
    id: "mem-stale-webinar",
    title: "Retired webinar promo",
    content: "The old February webinar promo is expired and should not be recommended.",
    tags: ["expired", "webinar"],
    importance: 0.7,
    confidence: 0.24,
    updatedAt: "2026-02-01T10:00:00.000Z"
  }
];
