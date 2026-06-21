import { describe, expect, it } from "vitest";
import { getLeadChannel, listLeadChannels } from "./channels";
import type { Lead } from "./types";

const leads: Lead[] = [
  {
    id: "1",
    name: "A",
    source: "Instagram DM",
    receivedAt: "2026-06-20T00:00:00.000Z",
    message: "Hello",
    status: "new"
  },
  {
    id: "2",
    name: "B",
    source: "WhatsApp chat",
    receivedAt: "2026-06-20T00:00:00.000Z",
    message: "Hello",
    status: "new"
  },
  {
    id: "3",
    name: "C",
    source: "Website form",
    receivedAt: "2026-06-20T00:00:00.000Z",
    message: "Hello",
    status: "new"
  }
];

describe("getLeadChannel", () => {
  it("normalizes WhatsApp-style sources to a WhatsApp channel", () => {
    expect(getLeadChannel("WhatsApp-style chat")).toBe("WhatsApp");
    expect(getLeadChannel("WhatsApp chat")).toBe("WhatsApp");
  });

  it("normalizes other core demo sources", () => {
    expect(getLeadChannel("Instagram DM")).toBe("Social DM");
    expect(getLeadChannel("LinkedIn comment")).toBe("Social comment");
    expect(getLeadChannel("Website form")).toBe("Web form");
  });
});

describe("listLeadChannels", () => {
  it("returns All plus unique lead channels in source order", () => {
    expect(listLeadChannels(leads)).toEqual(["All", "Social DM", "WhatsApp", "Web form"]);
  });
});
