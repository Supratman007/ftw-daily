export type AgentStatus = "pending" | "active" | "suspended";

export interface SalesAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  referral_code: string;
  status: AgentStatus;
  created_at: string;
}

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  pending: "Pending approval",
  active: "Active",
  suspended: "Suspended",
};
