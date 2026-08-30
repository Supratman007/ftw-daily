export type CancellationPath = "standard" | "force_majeure";
export type CancellationStatus = "pending_review" | "approved" | "rejected";
export type CancellationResolution = "refund" | "reschedule" | "gift_voucher" | "rejected";
export type GiftVoucherStatus = "issued" | "redeemed" | "expired";

export interface CancellationPolicyTier {
  id: string;
  min_days_before_departure: number;
  refund_percent: number;
}

export interface CancellationRequest {
  id: string;
  booking_id: string;
  requested_at: string;
  path: CancellationPath;
  evidence_path: string | null;
  reason: string | null;
  calculated_refund_percent: number | null;
  calculated_refund_amount_idr: number | null;
  resolution: CancellationResolution | null;
  status: CancellationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
}

export interface GiftVoucher {
  id: string;
  original_booking_id: string;
  product_id: string;
  value_amount_idr: number;
  recipient_name: string;
  recipient_contact: string;
  redemption_code: string;
  status: GiftVoucherStatus;
  issued_at: string;
  expires_at: string;
}

export const CANCELLATION_PATH_LABELS: Record<CancellationPath, string> = {
  standard: "Standard cancellation",
  force_majeure: "Force majeure",
};

export const CANCELLATION_STATUS_LABELS: Record<CancellationStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

export const CANCELLATION_RESOLUTION_LABELS: Record<CancellationResolution, string> = {
  refund: "Refund",
  reschedule: "Rescheduled",
  gift_voucher: "Gift voucher",
  rejected: "Rejected",
};
