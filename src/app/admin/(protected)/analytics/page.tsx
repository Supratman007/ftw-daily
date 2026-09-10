import Link from "next/link";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { formatCommissionAmount } from "@/lib/agents/commission";
import { REPORT_PRESETS, resolveReportRange } from "@/lib/reports/dateRange";

const cardClass = "rounded-2xl border border-sand-deep bg-white p-5";

type BookingRow = {
  total_idr: number;
  product_id: string;
  referred_by_agent_id: string | null;
  commission_amount_usd: number | null;
  products: { title: string } | null;
  sales_agents: { name: string; referral_code: string } | null;
};

/**
 * Spec §12 Phase 4's "Analytics (which agents/products/channels
 * convert best)" -- deliberately built from data the app already has
 * (confirmed bookings, their product, and whether an agent referral is
 * attached) rather than adding new pageview/traffic tracking: there's
 * no visitor-analytics instrumentation anywhere in this app today, and
 * standing that up is a materially different, much bigger project than
 * "show me what's already in the database, ranked." "Channels" here
 * means the one channel distinction the data model actually supports:
 * direct vs. agent-referred. Same date-range picker as Reports (shared
 * dateRange lib), same visual style, same "accounting can see this"
 * role scoping -- this is a natural sibling to that page, not a
 * separate concept.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await requireAdminSection("analytics");
  const { preset: presetParam, from: fromParam, to: toParam } = await searchParams;
  const range = resolveReportRange(presetParam, fromParam, toParam);

  const supabase = await createSupabaseServerClient();

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "total_idr, product_id, referred_by_agent_id, commission_amount_usd, products(title), sales_agents(name, referral_code)"
    )
    .eq("status", "paid_confirmed");
  if (range.from) bookingsQuery = bookingsQuery.gte("created_at", `${range.from}T00:00:00Z`);
  if (range.to) bookingsQuery = bookingsQuery.lte("created_at", `${range.to}T23:59:59Z`);

  const { data } = await bookingsQuery;
  const rows = (data ?? []) as unknown as BookingRow[];

  // Top products -- same "aggregate in JS, sort desc" approach as
  // Reports' revenue-by-trip table (Supabase's client doesn't do
  // GROUP BY without a raw SQL view).
  const byProduct = new Map<string, { title: string; count: number; revenue: number }>();
  for (const r of rows) {
    const existing = byProduct.get(r.product_id);
    const title = r.products?.title ?? "Unknown trip";
    if (existing) {
      existing.count += 1;
      existing.revenue += r.total_idr;
    } else {
      byProduct.set(r.product_id, { title, count: 1, revenue: r.total_idr });
    }
  }
  const topProducts = Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue);

  // Top agents -- only rows with a referral attached.
  const byAgent = new Map<
    string,
    { name: string; referralCode: string; count: number; revenue: number; commissionUsd: number }
  >();
  for (const r of rows) {
    if (!r.referred_by_agent_id || !r.sales_agents) continue;
    const existing = byAgent.get(r.referred_by_agent_id);
    if (existing) {
      existing.count += 1;
      existing.revenue += r.total_idr;
      existing.commissionUsd += r.commission_amount_usd ?? 0;
    } else {
      byAgent.set(r.referred_by_agent_id, {
        name: r.sales_agents.name,
        referralCode: r.sales_agents.referral_code,
        count: 1,
        revenue: r.total_idr,
        commissionUsd: r.commission_amount_usd ?? 0,
      });
    }
  }
  const topAgents = Array.from(byAgent.values()).sort((a, b) => b.revenue - a.revenue);

  // Direct vs. agent-referred -- the one "channel" split this app's
  // data model actually supports (see the doc comment above).
  const directCount = rows.filter((r) => !r.referred_by_agent_id).length;
  const directRevenue = rows.filter((r) => !r.referred_by_agent_id).reduce((sum, r) => sum + r.total_idr, 0);
  const referredCount = rows.length - directCount;
  const referredRevenue = rows.reduce((sum, r) => sum + r.total_idr, 0) - directRevenue;
  const totalCount = rows.length;
  const pct = (n: number) => (totalCount === 0 ? "0%" : `${Math.round((n / totalCount) * 100)}%`);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Analytics</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Which trips, agents, and channels are converting best, for {range.label.toLowerCase()}.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {REPORT_PRESETS.map((p) => (
          <Link
            key={p.value}
            href={`/admin/analytics?preset=${p.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              range.preset === p.value
                ? "border-teal bg-[#E3F2F1] text-teal"
                : "border-sand-deep text-ink-soft hover:bg-sand"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="preset" value="custom" />
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={range.preset === "custom" ? (range.from ?? undefined) : undefined}
            className="rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={range.preset === "custom" ? (range.to ?? undefined) : undefined}
            className="rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
          />
        </div>
        <button type="submit" className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white">
          Custom range
        </button>
      </form>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">Direct vs. agent-referred</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Every confirmed booking in this range, split by whether it came through a Sales Agent&apos;s link.
      </p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Direct</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">
            {directCount} <span className="text-sm font-normal text-ink-soft">({pct(directCount)})</span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">{formatIdr(directRevenue)}</p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Agent-referred</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">
            {referredCount} <span className="text-sm font-normal text-ink-soft">({pct(referredCount)})</span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">{formatIdr(referredRevenue)}</p>
        </div>
      </div>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">Top trips</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Bookings</th>
              <th className="px-4 py-2">Revenue</th>
              <th className="px-4 py-2">Avg. per booking</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  No confirmed bookings in this range.
                </td>
              </tr>
            ) : (
              topProducts.map((r) => (
                <tr key={r.title} className="border-t border-sand-deep">
                  <td className="px-4 py-2 text-ink">{r.title}</td>
                  <td className="px-4 py-2">{r.count}</td>
                  <td className="px-4 py-2 font-semibold text-ink">{formatIdr(r.revenue)}</td>
                  <td className="px-4 py-2 text-ink-soft">{formatIdr(Math.round(r.revenue / r.count))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">Top Sales Agents</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Ranked by revenue their referrals brought in. See Commissions for what&apos;s actually owed/paid.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Agent</th>
              <th className="px-4 py-2">Referred bookings</th>
              <th className="px-4 py-2">Revenue</th>
              <th className="px-4 py-2">Commission</th>
            </tr>
          </thead>
          <tbody>
            {topAgents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  No agent-referred bookings in this range.
                </td>
              </tr>
            ) : (
              topAgents.map((a) => (
                <tr key={a.referralCode} className="border-t border-sand-deep">
                  <td className="px-4 py-2 text-ink">
                    {a.name} <span className="font-mono text-xs text-ink-soft">({a.referralCode})</span>
                  </td>
                  <td className="px-4 py-2">{a.count}</td>
                  <td className="px-4 py-2 font-semibold text-ink">{formatIdr(a.revenue)}</td>
                  <td className="px-4 py-2 text-ink-soft">{formatCommissionAmount(a.commissionUsd)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
