import Link from "next/link";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
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

type PageViewRow = { path: string; locale: "en" | "id"; referrer_host: string | null; visitor_id: string };

/**
 * Spec §12 Phase 4's "Analytics (which agents/products/channels
 * convert best)". Two data sources feed this page: confirmed bookings
 * (top trips, top agents, direct-vs-referred) and, further down, the
 * in-house visitor tracker (page_views, via PageViewTracker.tsx +
 * src/app/api/track/route.ts) for raw traffic -- top pages, unique
 * visitors, where they came from. "Channels" in the spec's own phrase
 * means the one channel distinction the data model actually supports:
 * direct vs. agent-referred bookings, plus (now) external referrer
 * hosts for raw traffic -- there's still no UTM/campaign tagging
 * anywhere in this app. Same date-range picker as Reports (shared
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

  // Raw site traffic, from the in-house visitor tracker -- separate
  // query since page_views has nothing to do with bookings. Service-
  // role client, deliberately: page_views has zero RLS policies (see
  // its migration) since every write already goes through
  // /api/track's own service-role client, not a customer-writable
  // policy -- this page's own requireAdminSection call above is the
  // real access gate for reading it.
  const serviceClient = createSupabaseServiceRoleClient();
  let pageViewsQuery = serviceClient.from("page_views").select("path, locale, referrer_host, visitor_id");
  if (range.from) pageViewsQuery = pageViewsQuery.gte("created_at", `${range.from}T00:00:00Z`);
  if (range.to) pageViewsQuery = pageViewsQuery.lte("created_at", `${range.to}T23:59:59Z`);
  const { data: pageViewData } = await pageViewsQuery;
  const pageViews = (pageViewData ?? []) as PageViewRow[];

  const totalViews = pageViews.length;
  const uniqueVisitors = new Set(pageViews.map((v) => v.visitor_id)).size;

  const byPath = new Map<string, { views: number; visitors: Set<string> }>();
  for (const v of pageViews) {
    const existing = byPath.get(v.path);
    if (existing) {
      existing.views += 1;
      existing.visitors.add(v.visitor_id);
    } else {
      byPath.set(v.path, { views: 1, visitors: new Set([v.visitor_id]) });
    }
  }

  // A tracked /p/[slug] path is just a slug -- resolve real trip
  // titles for the ones that actually got traffic, in one batched
  // query, rather than one lookup per row.
  const productPathPattern = /^\/(?:id\/)?p\/([^/]+)$/;
  const slugsWithTraffic = Array.from(byPath.keys())
    .map((path) => path.match(productPathPattern)?.[1])
    .filter((slug): slug is string => Boolean(slug));
  const { data: productTitleRows } =
    slugsWithTraffic.length > 0
      ? await supabase.from("products").select("slug, title").in("slug", slugsWithTraffic)
      : { data: [] as Array<{ slug: string; title: string }> };
  const titleBySlug = new Map((productTitleRows ?? []).map((p) => [p.slug, p.title]));

  const topPages = Array.from(byPath.entries())
    .map(([path, v]) => {
      const slug = path.match(productPathPattern)?.[1];
      const title = slug ? titleBySlug.get(slug) : undefined;
      return { path, label: title ? `${title} (${path})` : path, views: v.views, visitors: v.visitors.size };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  const byLocale = new Map<string, number>();
  for (const v of pageViews) {
    byLocale.set(v.locale, (byLocale.get(v.locale) ?? 0) + 1);
  }

  const byReferrer = new Map<string, number>();
  for (const v of pageViews) {
    if (!v.referrer_host) continue;
    byReferrer.set(v.referrer_host, (byReferrer.get(v.referrer_host) ?? 0) + 1);
  }
  const topReferrers = Array.from(byReferrer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const directViewCount = totalViews - Array.from(byReferrer.values()).reduce((sum, n) => sum + n, 0);

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
        <button type="submit" className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark">
          Custom range
        </button>
      </form>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">Website traffic</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Real page views of the public site (not the admin/agent panels), tracked since this feature
        shipped -- there&apos;s no history from before then.
      </p>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Page views</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">{totalViews}</p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Unique visitors</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">{uniqueVisitors}</p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">English / Indonesian</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">
            {byLocale.get("en") ?? 0} / {byLocale.get("id") ?? 0}
          </p>
        </div>
      </div>

      <h3 className="mt-6 font-serif text-base font-semibold text-ink">Top pages</h3>
      <div className="mt-2 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Page</th>
              <th className="px-4 py-2">Views</th>
              <th className="px-4 py-2">Unique visitors</th>
            </tr>
          </thead>
          <tbody>
            {topPages.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ink-soft">
                  No tracked page views in this range.
                </td>
              </tr>
            ) : (
              topPages.map((p) => (
                <tr key={p.path} className="border-t border-sand-deep transition-colors hover:bg-sand">
                  <td className="px-4 py-2 text-ink">{p.label}</td>
                  <td className="px-4 py-2">{p.views}</td>
                  <td className="px-4 py-2 text-ink-soft">{p.visitors}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-serif text-base font-semibold text-ink">Where visitors came from</h3>
      <div className="mt-2 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[400px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Views</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-sand-deep transition-colors hover:bg-sand">
              <td className="px-4 py-2 text-ink">Direct / unknown</td>
              <td className="px-4 py-2">{directViewCount}</td>
            </tr>
            {topReferrers.map(([host, count]) => (
              <tr key={host} className="border-t border-sand-deep transition-colors hover:bg-sand">
                <td className="px-4 py-2 text-ink">{host}</td>
                <td className="px-4 py-2">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                <tr key={r.title} className="border-t border-sand-deep transition-colors hover:bg-sand">
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
                <tr key={a.referralCode} className="border-t border-sand-deep transition-colors hover:bg-sand">
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
