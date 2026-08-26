import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { BOOKING_STATUS_LABELS, type Booking, type BookingStatus } from "@/lib/bookings/types";

type BookingRow = Booking & {
  products: { title: string } | null;
  customers: { name: string; email: string; phone: string | null } | null;
};

const STATUS_FILTERS: Array<{ value: BookingStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "paid_confirmed", label: BOOKING_STATUS_LABELS.paid_confirmed },
  { value: "pending_payment", label: BOOKING_STATUS_LABELS.pending_payment },
  { value: "expired", label: BOOKING_STATUS_LABELS.expired },
  { value: "cancelled", label: BOOKING_STATUS_LABELS.cancelled },
];

/**
 * First real visibility into bookings anywhere in the admin UI --
 * before this, the only way to see a booking at all was the staff
 * notification email. Requires the admin read policies added in
 * 0005_admin_bookings_access.sql.
 */
export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("bookings")
    .select("*, products(title), customers(name, email, phone)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  const bookings = (data ?? []) as BookingRow[];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Bookings</h1>

      <form method="GET" className="mt-4 flex gap-3">
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Filter
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          Couldn&apos;t load bookings: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Booking code</th>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Trip date</th>
              <th className="px-4 py-2">Pax</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Purchase date</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-sand-deep align-top">
                <td className="px-4 py-2 font-mono text-xs font-medium text-ink">
                  {b.booking_code}
                </td>
                <td className="px-4 py-2 text-ink">{b.products?.title ?? "—"}</td>
                <td className="px-4 py-2">{b.slot_date}</td>
                <td className="px-4 py-2">{b.pax_count}</td>
                <td className="px-4 py-2">
                  <div className="text-ink">{b.customers?.name ?? "—"}</div>
                  <div className="text-xs text-ink-soft">{b.customers?.email}</div>
                  {b.customers?.phone && (
                    <div className="text-xs text-ink-soft">{b.customers.phone}</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  {formatIdr(b.total_idr)}
                  {b.discount_code && (
                    <div className="text-xs text-teal">code: {b.discount_code}</div>
                  )}
                </td>
                <td className="px-4 py-2">{BOOKING_STATUS_LABELS[b.status]}</td>
                <td className="px-4 py-2 text-xs text-ink-soft">
                  {new Date(b.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/bookings/${b.id}`} className="text-teal underline">
                    View details
                  </Link>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && !error && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-ink-soft">
                  No bookings match this filter yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
