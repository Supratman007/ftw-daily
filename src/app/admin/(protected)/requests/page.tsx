import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BOOKING_STATUS_LABELS, type Booking, type BookingStatus } from "@/lib/bookings/types";

type RequestRow = Booking & {
  products: { title: string } | null;
  customers: { name: string; email: string } | null;
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "action_needed", label: "Needs action" },
  { value: "under_review", label: "Under review" },
  { value: "confirmed_awaiting_payment", label: "Confirmed — awaiting payment" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
  { value: "paid_confirmed", label: "Confirmed" },
  { value: "all", label: "All" },
];

/**
 * Spec §6b/§4: /admin/requests, the review queue for manual-
 * confirmation bookings (Rinjani and anything else flagged
 * is_bookable = false). "Needs action" (under_review or
 * confirmed_awaiting_payment) is the default, since that's the
 * day-to-day work -- everything else is here for reference, same
 * pattern as /admin/bookings' status filter.
 */
export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeFilter = status ?? "action_needed";

  const supabase = await createSupabaseServerClient();
  let query = supabase.from("bookings").select("*, products(title), customers(name, email)");

  if (activeFilter === "action_needed") {
    query = query.in("status", ["under_review", "confirmed_awaiting_payment"]);
  } else if (activeFilter !== "all") {
    query = query.eq("status", activeFilter as BookingStatus);
  } else {
    query = query.in("status", [
      "under_review",
      "confirmed_awaiting_payment",
      "declined",
      "expired",
      "paid_confirmed",
      "cancelled",
    ]);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  const requests = (data ?? []) as RequestRow[];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Booking requests</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Manual-confirmation bookings (Rinjani and similar) -- check park permit availability, then
        confirm or decline.
      </p>

      <form method="GET" className="mt-4 flex gap-3">
        <select
          name="status"
          defaultValue={activeFilter}
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
          Couldn&apos;t load requests: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Requested</th>
              <th className="px-4 py-2">Booking code</th>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Trip date</th>
              <th className="px-4 py-2">Pax</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 text-xs text-ink-soft">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-ink">{r.booking_code}</td>
                <td className="px-4 py-2 text-ink">{r.products?.title ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{r.slot_date}</td>
                <td className="px-4 py-2 text-ink-soft">{r.pax_count}</td>
                <td className="px-4 py-2">
                  <div className="text-ink">{r.customers?.name ?? "—"}</div>
                  <div className="text-xs text-ink-soft">{r.customers?.email}</div>
                </td>
                <td className="px-4 py-2 text-ink-soft">{BOOKING_STATUS_LABELS[r.status]}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/requests/${r.id}`} className="text-teal underline">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {requests.length === 0 && !error && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-soft">
                  Nothing here right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
