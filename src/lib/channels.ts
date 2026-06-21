import type { Lead } from "./types";

export type LeadChannel =
  | "All"
  | "Social DM"
  | "Social comment"
  | "Web form"
  | "Email"
  | "WhatsApp"
  | "Other";

export const getLeadChannel = (source: string): Exclude<LeadChannel, "All"> => {
  const normalized = source.toLowerCase();

  if (normalized.includes("whatsapp")) return "WhatsApp";
  if (normalized.includes("comment")) return "Social comment";
  if (normalized.includes("dm") || normalized.includes("messenger")) return "Social DM";
  if (normalized.includes("form") || normalized.includes("landing")) return "Web form";
  if (normalized.includes("email") || normalized.includes("referral")) return "Email";

  return "Other";
};

export const listLeadChannels = (leads: Lead[]): LeadChannel[] => {
  const channels = leads.map((lead) => getLeadChannel(lead.source));
  return ["All", ...channels.filter((channel, index) => channels.indexOf(channel) === index)];
};
