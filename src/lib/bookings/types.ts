export type BookingStatus = "pending_payment" | "paid_confirmed" | "expired" | "cancelled";

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
  hotel_name: string | null;
  room_number: string | null;
  created_at: string;
  updated_at: string;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "Pending payment",
  paid_confirmed: "Confirmed",
  expired: "Expired",
  cancelled: "Cancelled",
};
