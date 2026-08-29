import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InboxRow = {
  id: string;
  kind: "customer_booking" | "agent_support";
  status: "open" | "resolved";
  updated_at: string;
  bookings: { booking_code: string; customers: { name: string } | null; products: { title: string } | null } | null;
  sales_agents: { name: string; referral_code: string } | null;
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

/**
 * Spec §6c: one unified inbox for both customer booking threads and
 * agent support threads, sorted by most recently active -- avoids
 * building two separate inboxes for what's structurally the same
 * feature, and means nothing falls through the cracks because it
 * landed in a channel nobody was checking.
 */
export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeFilter = status ?? "open";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("conversations")
    .select(
      "id, kind, status, updated_at, bookings(booking_code, customers(name), products(title)), sales_agents(name, referral_code)"
    )
    .order("updated_at", { ascending: false });

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data, error } = await query;
  const conversations = (data ?? []) as unknown as InboxRow[];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Inbox</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Customer booking threads and agent support threads, in one place.
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
          Couldn&apos;t load the inbox: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-sand-deep bg-white">
        {conversations.length === 0 && !error ? (
          <p className="px-4 py-6 text-sm text-ink-soft">Nothing here right now.</p>
        ) : (
          conversations.map((c) => (
            <Link
              key={c.id}
              href={`/admin/inbox/${c.id}`}
              className="flex items-center justify-between gap-4 border-t border-sand-deep px-4 py-3 text-sm first:border-t-0 hover:bg-sand"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      c.kind === "agent_support" ? "bg-teal-light text-teal" : "bg-sand text-ink-soft"
                    }`}
                  >
                    {c.kind === "agent_support" ? "Agent" : "Customer"}
                  </span>
                  <p className="truncate font-semibold text-ink">
                    {c.kind === "agent_support"
                      ? `${c.sales_agents?.name ?? "—"} (${c.sales_agents?.referral_code ?? "—"})`
                      : c.bookings?.customers?.name ?? "—"}
                  </p>
                </div>
                <p className="truncate text-ink-soft">
                  {c.kind === "customer_booking"
                    ? `${c.bookings?.products?.title ?? "Trip"} · ${c.bookings?.booking_code ?? ""}`
                    : "Agent support"}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-ink-soft">
                <p>{c.status === "resolved" ? "Resolved" : "Open"}</p>
                <p>{new Date(c.updated_at).toLocaleString()}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
