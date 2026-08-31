export type CancellationPath = "standard" | "force_majeure";
export type CancellationStatus = "pending_review" | "approved" | "rejected";
export type CancellationResolution = "refund" | "reschedule" | "gift_voucher" | "rejected";
export type CancellationPreferredResolution = "refund" | "reschedule" | "gift_voucher";
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
  // What the customer said they'd prefer, picked on the request form --
  // a preference for staff to weigh, not a binding choice. Null on
  // requests submitted before this field existed.
  preferred_resolution: CancellationPreferredResolution | null;
  // Only set when preferred_resolution is "reschedule" -- the date the
  // customer asked for. Pre-fills the admin's reschedule form; the
  // admin can still pick a different date if it's unavailable.
  preferred_new_date: string | null;
  // Only set when preferred_resolution is "gift_voucher" -- who the
  // customer wants the trip transferred to. Pre-fills the admin's
  // approve-voucher form so staff aren't re-entering it by hand.
  preferred_gift_recipient_name: string | null;
  preferred_gift_recipient_email: string | null;
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
  // Set once the recipient submits the /redeem form -- who actually
  // showed up to redeem it, which can differ from recipient_name/
  // recipient_contact (those are who the *original customer* said the
  // gift was for).
  redeemed_by_name: string | null;
  redeemed_by_email: string | null;
  redeemed_by_phone: string | null;
  requested_pax_count: number | null;
  requested_slot_date: string | null;
  redemption_message: string | null;
  redemption_requested_at: string | null;
  // Set once staff confirm the redemption -- the real booking created
  // for the recipient, which is what makes /account/booking/[id] (and
  // its chat panel) their trip's home in the app.
  redeemed_booking_id: string | null;
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

export const CANCELLATION_PREFERRED_RESOLUTION_LABELS: Record<CancellationPreferredResolution, string> = {
  refund: "A refund",
  reschedule: "Reschedule to a new date",
  gift_voucher: "Give it as a gift to someone else",
};
