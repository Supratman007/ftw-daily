import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { BOOKING_STATUS_LABELS, type Booking } from "@/lib/bookings/types";

const cardClass =
  "rounded-2xl border border-sand-deep bg-white p-5 transition hover:shadow-md";
const pendingAgentCardClass =
  "rounded-2xl border border-coral bg-[#FCE6DD] p-5 transition hover:shadow-md";

type RecentBooking = Booking & { products: { title: string } | null };

/**
 * "Not meant to be analyzed, just oriented" -- same spirit as the
 * customer account Overview (§6h), just for you: what needs attention
 * right now, and where to go for more. No spec section defines this
 * page's exact contents (unlike §6h for the customer side), so this is
 * a reasonable Phase 1 shape: today's confirmed-revenue snapshot and
 * the most recent bookings, not a full analytics dashboard.
 */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; password_set?: string }>;
}) {
  await requireAdmin();
  const { error, password_set } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [
    confirmedCount,
    pendingCount,
    revenue,
    recent,
    pendingAgentCount,
    pendingRequestCount,
    openConversationCount,
    pendingCancellationCount,
  ] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "paid_confirmed"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending_payment"),
    supabase.from("bookings").select("total_idr").eq("status", "paid_confirmed"),
    supabase
      .from("bookings")
      .select("*, products(title)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("sales_agents").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "under_review"),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("cancellation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
  ]);

  const totalRevenueIdr = (revenue.data ?? []).reduce((sum, r) => sum + r.total_idr, 0);
  const recentBookings = (recent.data ?? []) as RecentBooking[];
  const pendingAgents = pendingAgentCount.count ?? 0;
  const pendingRequests = pendingRequestCount.count ?? 0;
  const openConversations = openConversationCount.count ?? 0;
  const pendingCancellations = pendingCancellationCount.count ?? 0;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Overview</h1>

      {error === "super_admin_only" && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          Only Super Admin accounts can manage the team.
        </p>
      )}
      {password_set === "1" && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Your password has been set. Welcome!
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Confirmed bookings
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">
            {confirmedCount.count ?? 0}
          </p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Pending payment
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">
            {pendingCount.count ?? 0}
          </p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Total confirmed revenue
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">
            {formatIdr(totalRevenueIdr)}
          </p>
        </div>
        <Link
          href="/admin/agents"
          className={pendingAgents > 0 ? pendingAgentCardClass : cardClass}
        >
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Sales Agent applications
          </p>
          <p
            className={`mt-1 font-serif text-2xl font-semibold ${pendingAgents > 0 ? "text-coral-dark" : "text-ink"}`}
          >
            {pendingAgents} pending
          </p>
        </Link>
        <Link
          href="/admin/requests"
          className={pendingRequests > 0 ? pendingAgentCardClass : cardClass}
        >
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Booking requests
          </p>
          <p
            className={`mt-1 font-serif text-2xl font-semibold ${pendingRequests > 0 ? "text-coral-dark" : "text-ink"}`}
          >
            {pendingRequests} awaiting review
          </p>
        </Link>
        <Link
          href="/admin/inbox"
          className={openConversations > 0 ? pendingAgentCardClass : cardClass}
        >
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Inbox</p>
          <p
            className={`mt-1 font-serif text-2xl font-semibold ${openConversations > 0 ? "text-coral-dark" : "text-ink"}`}
          >
            {openConversations} open
          </p>
        </Link>
        <Link
          href="/admin/cancellations"
          className={pendingCancellations > 0 ? pendingAgentCardClass : cardClass}
        >
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Cancellations
          </p>
          <p
            className={`mt-1 font-serif text-2xl font-semibold ${pendingCancellations > 0 ? "text-coral-dark" : "text-ink"}`}
          >
            {pendingCancellations} awaiting review
          </p>
        </Link>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink">Recent bookings</h2>
        <Link href="/admin/bookings" className="text-sm font-semibold text-teal hover:underline">
          View all →
        </Link>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-sand-deep bg-white">
        {recentBookings.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">No bookings yet.</p>
        ) : (
          recentBookings.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between border-t border-sand-deep px-4 py-3 text-sm first:border-t-0"
            >
              <div>
                <p className="font-semibold text-ink">{b.products?.title ?? "Trip"}</p>
                <p className="text-ink-soft">
                  {b.booking_code} · {b.slot_date} · {BOOKING_STATUS_LABELS[b.status]}
                </p>
              </div>
              <span className="text-ink-soft">{formatIdr(b.total_idr)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
