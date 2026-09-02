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
  // Car Hire / Transport only (spec §6a, §6e) -- car_type_id/
  // car_package_id are null for every other product type.
  car_type_id: string | null;
  car_package_id: string | null;
  // Transport only -- which vehicle/service tier (e.g. Sedan vs. Van,
  // Shared vs. Private Speedboat) was booked.
  transport_vehicle_type_id: string | null;
  pickup_datetime: string | null;
  // Mutually exclusive by convention: meeting_point_id is set if
  // chosen from the admin-managed list, meeting_point_custom if
  // "Other" was picked instead. Both null for a product type that
  // doesn't use pickup at all.
  meeting_point_id: string | null;
  meeting_point_custom: string | null;
  // Car Hire / Transport only -- a fresh number captured at booking
  // time so the driver has a direct line to the customer on arrival,
  // separate from the account's own (possibly stale) phone number.
  pickup_whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

/** Self-service pickup-time change audit trail (spec §6e) -- a driver
 * dispatch depends on this being accurate. */
export interface BookingPickupChange {
  id: string;
  booking_id: string;
  old_datetime: string;
  new_datetime: string;
  changed_at: string;
}

/** How close to pickup a customer can still change it themselves --
 * spec §6e proposes this as a sensible default, admin-configurable
 * later if it ever needs to be; hardcoded here for now since there's
 * no admin settings screen for it yet. */
export const PICKUP_CHANGE_CUTOFF_HOURS = 3;

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
