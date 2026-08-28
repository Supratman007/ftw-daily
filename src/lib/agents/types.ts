export type AgentStatus = "pending" | "active" | "suspended";
export type AgentType = "personal" | "business";

export interface SalesAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  referral_code: string;
  status: AgentStatus;
  agent_type: AgentType;
  pic_name: string | null;
  pic_phone: string | null;
  id_document_path: string | null;
  business_document_path: string | null;
  created_at: string;
}

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  pending: "Pending approval",
  active: "Active",
  suspended: "Suspended",
};

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  personal: "Personal",
  business: "Business",
};

export type CommissionStatus = "pending" | "paid";

export interface CommissionTier {
  id: string;
  name: string;
  min_referrals: number;
  commission_percent: number;
  sort_order: number;
}
