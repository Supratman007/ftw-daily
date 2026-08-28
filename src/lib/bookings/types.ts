export type BookingStatus =
  | "pending_payment"
  | "paid_confirmed"
  | "expired"
  | "cancelled"
  // Spec §6b, manual-confirmation products (is_bookable = false):
  // under_review -> confirmed_awaiting_payment -> paid_confirmed (via
  // the same webhook instant-book already uses), with declined/expired
  // as the two ways off that path.
  | "under_review"
  | "confirmed_awaiting_payment"
  | "declined";

export interface Booking {
  id: string;
  booking_code: string;
  customer_id: string;
  product_id: string;
  slot_date: string;
  pax_count: number;
  subtotal_usd: number;
  total_usd: number;
  total_idr: number;
  status: BookingStatus;
  xendit_invoice_id: string | null;
  xendit_invoice_url: string | null;
  discount_code: string | null;
  discount_amount_usd: number;
  referred_by_agent_id: string | null;
  commission_amount_usd: number | null;
  commission_status: "pending" | "paid" | null;
  hotel_name: string | null;
  room_number: string | null;
  confirmation_deadline: string | null;
  admin_notes: string | null;
  decline_reason: string | null;
  insurance_total_idr: number;
  created_at: string;
  updated_at: string;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "Pending payment",
  paid_confirmed: "Confirmed",
  expired: "Expired",
  cancelled: "Cancelled",
  under_review: "Under review",
  confirmed_awaiting_payment: "Confirmed — awaiting payment",
  declined: "Declined",
};

export type InsuranceType = "self_provided" | "park_provided";

export interface Traveler {
  id: string;
  booking_id: string;
  full_name: string;
  passport_scan_path: string | null;
  insurance_type: InsuranceType;
  insurance_number: string | null;
  insurance_company: string | null;
  insurance_fee_idr: number;
  created_at: string;
}

/** Rp 290,000/person -- spec §6b's fixed park-provided insurance fee. */
export const PARK_INSURANCE_FEE_IDR = 290_000;
