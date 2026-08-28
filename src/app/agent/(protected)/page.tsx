import Link from "next/link";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateReferralQrCodeDataUrl } from "@/lib/agents/qrCode";
import { resolveCommissionTier, nextCommissionTier, monthlyEarnings } from "@/lib/agents/commission";
import { formatUsd } from "@/lib/currency";
import { CopyLinkButton } from "@/components/agent/CopyLinkButton";
import type { CommissionTier, CommissionStatus } from "@/lib/agents/types";

type ActivityRow = {
  id: string;
  booking_code: string;
  created_at: string;
  commission_amount_usd: number | null;
  commission_status: CommissionStatus | null;
  products: { title: string } | null;
  customers: { name: string } | null;
};

const statCardBase = "rounded-2xl border p-5";

/**
 * Stage 3 of the Sales Agent system, "made comprehensive" pass: the flat
 * 4-card grid from the first cut is now a proper dashboard -- colour-coded
 * stat cards, a progress bar toward the next tier, a 6-month earnings
 * chart, and a recent-activity feed so an agent gets the story without
 * clicking through to the full report. All server-rendered from the same
 * referred+paid_confirmed bookings query; only the copy-link button and
 * (on the report page) print/CSV controls need the client.
 */
export default async function AgentOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ password_set?: string }>;
}) {
  const agent = await requireAgent();
  const { password_set } = await searchParams;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const referralLink = `${siteUrl}/?ref=${agent.referral_code}`;

  let qrCodeDataUrl: string | null = null;
  let confirmedReferralCount = 0;
  let pendingUsd = 0;
  let paidUsd = 0;
  let currentTier: CommissionTier | null = null;
  let nextTier: CommissionTier | null = null;
  let chart: ReturnType<typeof monthlyEarnings> = [];
  let recentActivity: ActivityRow[] = [];
  let bestMonth: { label: string; totalUsd: number } | null = null;

  if (agent.status === "active") {
    const supabase = await createSupabaseServerClient();
    const [{ data: referred }, { data: tiers }, qr] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, booking_code, created_at, commission_amount_usd, commission_status, products(title), customers(name)"
        )
        .eq("referred_by_agent_id", agent.id)
        .eq("status", "paid_confirmed")
        .order("created_at", { ascending: false }),
      supabase
        .from("commission_tiers")
        .select("id, name, min_referrals, commission_percent, sort_order"),
      generateReferralQrCodeDataUrl(referralLink),
    ]);

    const rows = (referred ?? []) as unknown as ActivityRow[];
    confirmedReferralCount = rows.length;
    for (const row of rows) {
      const amount = row.commission_amount_usd ?? 0;
      if (row.commission_status === "paid") paidUsd += amount;
      else pendingUsd += amount;
    }
    currentTier = resolveCommissionTier(tiers ?? [], confirmedReferralCount);
    nextTier = nextCommissionTier(tiers ?? [], confirmedReferralCount);
    qrCodeDataUrl = qr;
    recentActivity = rows.slice(0, 5);
    chart = monthlyEarnings(rows);
    const peak = chart.reduce((best, m) => (m.totalUsd > best.totalUsd ? m : best), chart[0]);
    bestMonth = peak && peak.totalUsd > 0 ? peak : null;
  }

  const totalEarnedUsd = pendingUsd + paidUsd;
  const tierProgressPercent = nextTier
    ? Math.min(100, Math.round((confirmedReferralCount / nextTier.min_referrals) * 100))
    : 100;
  const maxChartUsd = Math.max(1, ...chart.map((m) => m.totalUsd));

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Welcome, {agent.name}</h1>

      {password_set === "1" && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Your password has been set. Welcome!
        </p>
      )}

      {agent.status === "pending" && (
        <p className="mt-4 rounded-lg border border-sand-deep bg-white p-4 text-sm text-ink-soft">
          Your application is under review. We&apos;ll let you know once you&apos;re approved --
          your referral link isn&apos;t active yet.
        </p>
      )}

      {agent.status === "suspended" && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-4 text-sm text-coral-dark">
          Your account has been suspended. Contact us if you think this is a mistake.
        </p>
      )}

      {agent.status === "active" && (
        <>
          {/* Referral card */}
          <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-sand-deep bg-white p-5 sm:flex-row sm:items-start">
            {qrCodeDataUrl && (
              /* eslint-disable-next-line @next/next/no-img-element -- a
                 generated data: URL, not an asset next/image can optimize */
              <img
                src={qrCodeDataUrl}
                alt="QR code for your referral link"
                width={140}
                height={140}
                className="mx-auto rounded-lg border border-sand-deep sm:mx-0"
              />
            )}
            <div className="flex-1">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
                Your referral code
              </p>
              <p className="mt-1 font-serif text-xl font-semibold text-ink">
                {agent.referral_code}
              </p>
              <p className="mt-4 font-mono text-xs uppercase tracking-widest text-ink-soft">
                Your referral link
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="break-all font-mono text-sm text-teal">{referralLink}</p>
                <CopyLinkButton link={referralLink} />
              </div>
              <p className="mt-4 text-sm text-ink-soft">
                Scan the QR code or share the link -- print it for flyers or business cards, or
                send it directly.
              </p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`${statCardBase} border-coral/30 bg-[#FDF1EC]`}>
              <p className="font-mono text-xs uppercase tracking-widest text-coral-dark">
                Your tier
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink">
                {currentTier ? `${currentTier.name}` : "—"}
                {currentTier && (
                  <span className="ml-1 text-base font-medium text-ink-soft">
                    ({currentTier.commission_percent}%)
                  </span>
                )}
              </p>
              {nextTier ? (
                <>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-coral"
                      style={{ width: `${tierProgressPercent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-ink-soft">
                    {nextTier.min_referrals - confirmedReferralCount} more referral
                    {nextTier.min_referrals - confirmedReferralCount === 1 ? "" : "s"} to{" "}
                    {nextTier.name} ({nextTier.commission_percent}%)
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs font-semibold text-coral-dark">
                  Highest tier reached 🎉
                </p>
              )}
            </div>

            <div className={`${statCardBase} border-teal/30 bg-teal-light`}>
              <p className="font-mono text-xs uppercase tracking-widest text-teal">
                Confirmed referrals
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink">
                {confirmedReferralCount}
              </p>
              <p className="mt-3 text-xs text-ink-soft">Bookings that completed payment</p>
            </div>

            <div className={`${statCardBase} border-sand-deep bg-white`}>
              <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
                Pending payout
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink">
                {formatUsd(pendingUsd)}
              </p>
              <p className="mt-3 text-xs text-ink-soft">Earned, not yet paid out</p>
            </div>

            <div className={`${statCardBase} border-ocean/20 bg-[#EAF1F1]`}>
              <p className="font-mono text-xs uppercase tracking-widest text-ocean">Paid out</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink">
                {formatUsd(paidUsd)}
              </p>
              <p className="mt-3 text-xs text-ink-soft">
                Lifetime earned: {formatUsd(totalEarnedUsd)}
              </p>
            </div>
          </div>

          {/* Earnings chart */}
          <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-ink">Earnings, last 6 months</h2>
              {bestMonth && (
                <p className="text-xs text-ink-soft">
                  Best month: <span className="font-semibold text-ink">{bestMonth.label}</span> (
                  {formatUsd(bestMonth.totalUsd)})
                </p>
              )}
            </div>
            {totalEarnedUsd === 0 ? (
              <p className="mt-6 text-sm text-ink-soft">
                No commission earned yet -- share your link to get your first referral.
              </p>
            ) : (
              <div className="mt-6 flex items-end gap-3 sm:gap-6">
                {chart.map((m) => {
                  const heightPercent = m.totalUsd > 0 ? Math.max(6, (m.totalUsd / maxChartUsd) * 100) : 3;
                  return (
                    <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                      <p className="text-xs font-semibold text-ink">
                        {m.totalUsd > 0 ? formatUsd(m.totalUsd) : ""}
                      </p>
                      <div className="flex h-32 w-full items-end">
                        <div
                          className={`w-full rounded-t-md ${m.totalUsd > 0 ? "bg-teal" : "bg-sand"}`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                        {m.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-ink">Recent activity</h2>
            <Link href="/agent/bookings" className="text-sm font-semibold text-teal hover:underline">
              View full report →
            </Link>
          </div>

          <div className="mt-2 overflow-hidden rounded-lg border border-sand-deep bg-white">
            {recentActivity.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-soft">
                No referrals yet -- once a customer books through your link and pays, it&apos;ll
                show up here.
              </p>
            ) : (
              recentActivity.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-4 border-t border-sand-deep px-4 py-3 text-sm first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {r.products?.title ?? "Trip"}
                    </p>
                    <p className="truncate text-ink-soft">
                      {r.booking_code} · {r.customers?.name ?? "—"} ·{" "}
                      {r.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-ink">
                      {r.commission_amount_usd != null ? formatUsd(r.commission_amount_usd) : "—"}
                    </p>
                    <p
                      className={`text-xs ${r.commission_status === "paid" ? "text-teal" : "text-ink-soft"}`}
                    >
                      {r.commission_status === "paid" ? "Paid" : "Pending"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
