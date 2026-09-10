import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { formatCommissionAmount } from "@/lib/agents/commission";

type BookingDetail = {
  id: string;
  booking_code: string;
  slot_date: string;
  pax_count: number;
  total_idr: number;
  hotel_name: string | null;
  room_number: string | null;
  commission_amount_usd: number | null;
  commission_status: "pending" | "paid" | null;
  created_at: string;
  products: { title: string } | null;
  customers: { name: string } | null;
};

const rowClass = "flex justify-between border-b border-sand-deep py-2 last:border-b-0";
const labelClass = "text-ink-soft";

/**
 * The single-booking detail the condensed sales report table's "View"
 * link opens -- everything the report row leaves out (customer name,
 * hotel, room) without widening that table back into the "messy" 10
 * columns it was before. Scoped to this agent's own referred +
 * paid_confirmed bookings same as the report itself; RLS (0012)
 * enforces this independent of the query filters below.
 */
export default async function AgentBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const agent = await requireAgent();
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, booking_code, slot_date, pax_count, total_idr, hotel_name, room_number, commission_amount_usd, commission_status, created_at, products(title), customers(name)"
    )
    .eq("id", id)
    .eq("referred_by_agent_id", agent.id)
    .eq("status", "paid_confirmed")
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const booking = data as unknown as BookingDetail;

  return (
    <div className="max-w-lg">
      <Link href="/agent/bookings" className="text-sm font-semibold text-teal hover:underline">
        ← Back to sales report
      </Link>

      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">{booking.booking_code}</h1>
      <p className="mt-1 text-ink-soft">{booking.products?.title ?? "Trip"}</p>

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-5 text-sm">
        <div className={rowClass}>
          <span className={labelClass}>Purchase date</span>
          <span className="text-ink">{booking.created_at.slice(0, 10)}</span>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Trip date</span>
          <span className="text-ink">{booking.slot_date}</span>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Travelers</span>
          <span className="text-ink">{booking.pax_count}</span>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Customer</span>
          <span className="text-ink">{booking.customers?.name ?? "—"}</span>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Hotel</span>
          <span className="text-ink">{booking.hotel_name ?? "—"}</span>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Room</span>
          <span className="text-ink">{booking.room_number ?? "—"}</span>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Total</span>
          <span className="text-ink">{formatIdr(booking.total_idr)}</span>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Commission</span>
          <span className="font-semibold text-ink">
            {booking.commission_amount_usd != null
              ? formatCommissionAmount(booking.commission_amount_usd)
              : "—"}
          </span>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Commission status</span>
          <span className="text-ink">
            {booking.commission_status === "paid" ? "Paid" : "Pending"}
          </span>
        </div>
      </div>
    </div>
  );
}
