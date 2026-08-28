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
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  /** Set while a bank account change is staged, awaiting the agent
   * clicking the confirm link emailed to them -- the pending values
   * themselves and the confirm token are never selected into this
   * type; the profile page only needs to know a change is in flight
   * and roughly when it expires. */
  bank_change_requested_at: string | null;
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
