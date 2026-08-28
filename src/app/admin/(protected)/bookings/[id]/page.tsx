import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd } from "@/lib/currency";
import { BOOKING_STATUS_LABELS, type Booking } from "@/lib/bookings/types";

type BookingRow = Booking & {
  products: { title: string; slug: string } | null;
  customers: { name: string; email: string; phone: string | null } | null;
  sales_agents: { name: string; referral_code: string } | null;
};

/**
 * Admin's version of the booking detail page -- full picture in one
 * place, unlike the deliberately lean list row. Requires the admin read
 * policies from 0005_admin_bookings_access.sql.
 */
export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bookings")
    .select("*, products(title, slug), customers(name, email, phone), sales_agents(name, referral_code)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const b = data as BookingRow;

  return (
    <div className="max-w-xl">
      <Link href="/admin/bookings" className="text-sm font-semibold text-teal hover:underline">
        ← Back to Bookings
      </Link>

      <h1 className="mt-3 font-serif text-2xl font-semibold text-ink">
        {b.products?.title ?? "Trip"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Booking code <span className="font-semibold text-ink">{b.booking_code}</span> ·{" "}
        {BOOKING_STATUS_LABELS[b.status]}
      </p>

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
        <p className="font-semibold text-ink">Trip</p>
        <div className="mt-2 flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Trip date</span>
          <span className="text-ink">{b.slot_date}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Travelers</span>
          <span className="text-ink">{b.pax_count}</span>
        </div>
        {b.discount_code && b.discount_amount_usd > 0 && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Discount ({b.discount_code})</span>
            <span className="text-teal">-{formatUsd(b.discount_amount_usd)}</span>
          </div>
        )}
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">
            Total{b.status === "paid_confirmed" ? " paid" : ""}
          </span>
          <span className="font-semibold text-ink">{formatIdr(b.total_idr)}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-ink-soft">Purchase date</span>
          <span className="text-ink">{new Date(b.created_at).toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
        <p className="font-semibold text-ink">Customer</p>
        <p className="mt-2 text-ink">{b.customers?.name ?? "—"}</p>
        <p className="text-ink-soft">{b.customers?.email}</p>
        {b.customers?.phone && <p className="text-ink-soft">{b.customers.phone}</p>}
      </div>

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
        <p className="font-semibold text-ink">Pickup</p>
        {b.hotel_name || b.room_number ? (
          <>
            {b.hotel_name && <p className="mt-2 text-ink">{b.hotel_name}</p>}
            {b.room_number && <p className="text-ink-soft">Room {b.room_number}</p>}
          </>
        ) : (
          <p className="mt-2 text-ink-soft">Not provided at checkout.</p>
        )}
      </div>

      {b.sales_agents && (
        <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
          <p className="font-semibold text-ink">Referral</p>
          <div className="mt-2 flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Agent</span>
            <span className="text-ink">
              {b.sales_agents.name} ({b.sales_agents.referral_code})
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-ink-soft">Commission</span>
            <span className="text-ink">
              {b.commission_amount_usd != null
                ? `${formatUsd(b.commission_amount_usd)} — ${
                    b.commission_status === "paid" ? "Paid" : "Pending"
                  }`
                : "Not confirmed yet"}
            </span>
          </div>
        </div>
      )}

      {b.xendit_invoice_url && (
        <a
          href={b.xendit_invoice_url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm font-semibold text-teal hover:underline"
        >
          View Xendit invoice →
        </a>
      )}
    </div>
  );
}
