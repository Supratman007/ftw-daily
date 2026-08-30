import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CANCELLATION_PATH_LABELS,
  CANCELLATION_PREFERRED_RESOLUTION_LABELS,
  CANCELLATION_STATUS_LABELS,
  type CancellationRequest,
} from "@/lib/cancellations/types";

type RequestRow = CancellationRequest & {
  bookings: { booking_code: string; products: { title: string } | null; customers: { name: string } | null } | null;
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

/**
 * Spec §6f/§4: /admin/cancellations, the review queue for
 * cancellation/reschedule requests -- same "customer-initiated
 * request → staff reviews → app executes" pattern as /admin/requests
 * (Rinjani) and the agent verification queue, reused a third time.
 */
export default async function AdminCancellationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeFilter = status ?? "pending_review";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("cancellation_requests")
    .select("*, bookings(booking_code, products(title), customers(name))")
    .order("requested_at", { ascending: false });

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data, error } = await query;
  const requests = (data ?? []) as unknown as RequestRow[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Cancellations</h1>
        <Link
          href="/admin/cancellations/policy"
          className="rounded-lg border border-sand-deep px-4 py-2 text-sm font-semibold text-ink hover:bg-sand"
        >
          Edit refund policy
        </Link>
      </div>

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
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Requested</th>
              <th className="px-4 py-2">Booking code</th>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Wants</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 text-xs text-ink-soft">
                  {new Date(r.requested_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-ink">
                  {r.bookings?.booking_code ?? "—"}
                </td>
                <td className="px-4 py-2 text-ink">{r.bookings?.products?.title ?? "—"}</td>
                <td className="px-4 py-2 text-ink">{r.bookings?.customers?.name ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{CANCELLATION_PATH_LABELS[r.path]}</td>
                <td className="px-4 py-2 text-ink-soft">
                  {r.preferred_resolution
                    ? CANCELLATION_PREFERRED_RESOLUTION_LABELS[r.preferred_resolution]
                    : "—"}
                </td>
                <td className="px-4 py-2 text-ink-soft">{CANCELLATION_STATUS_LABELS[r.status]}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/cancellations/${r.id}`} className="text-teal underline">
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
