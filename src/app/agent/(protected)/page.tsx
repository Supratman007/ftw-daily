import Link from "next/link";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateReferralQrCodeDataUrl } from "@/lib/agents/qrCode";
import { resolveCommissionTier, nextCommissionTier } from "@/lib/agents/commission";
import { formatUsd } from "@/lib/currency";
import type { CommissionTier } from "@/lib/agents/types";

/**
 * Stage 3 of the Sales Agent system: this is the real dashboard now --
 * referral code/link/QR (Stage 1), plus current tier and earnings
 * computed from the referred bookings Stage 2 started attributing and
 * stamping commission on. The full list lives at /agent/bookings.
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

  if (agent.status === "active") {
    const supabase = await createSupabaseServerClient();
    const [{ data: commissions }, { data: tiers }, qr] = await Promise.all([
      supabase
        .from("bookings")
        .select("commission_amount_usd, commission_status")
        .eq("referred_by_agent_id", agent.id)
        .eq("status", "paid_confirmed"),
      supabase
        .from("commission_tiers")
        .select("id, name, min_referrals, commission_percent, sort_order"),
      generateReferralQrCodeDataUrl(referralLink),
    ]);

    const rows = commissions ?? [];
    confirmedReferralCount = rows.length;
    for (const row of rows) {
      const amount = row.commission_amount_usd ?? 0;
      if (row.commission_status === "paid") paidUsd += amount;
      else pendingUsd += amount;
    }
    currentTier = resolveCommissionTier(tiers ?? [], confirmedReferralCount);
    nextTier = nextCommissionTier(tiers ?? [], confirmedReferralCount);
    qrCodeDataUrl = qr;
  }

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
              <p className="mt-1 break-all font-mono text-sm text-teal">{referralLink}</p>
              <p className="mt-4 text-sm text-ink-soft">
                Scan the QR code or share the link -- print it for flyers or business cards, or
                send it directly.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-sand-deep bg-white p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
                Your tier
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink">
                {currentTier ? `${currentTier.name} (${currentTier.commission_percent}%)` : "—"}
              </p>
              {nextTier && (
                <p className="mt-1 text-xs text-ink-soft">
                  {nextTier.min_referrals - confirmedReferralCount} more referral
                  {nextTier.min_referrals - confirmedReferralCount === 1 ? "" : "s"} to reach{" "}
                  {nextTier.name} ({nextTier.commission_percent}%)
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-sand-deep bg-white p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
                Confirmed referrals
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink">
                {confirmedReferralCount}
              </p>
            </div>
            <div className="rounded-2xl border border-sand-deep bg-white p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
                Pending payout
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink">
                {formatUsd(pendingUsd)}
              </p>
            </div>
            <div className="rounded-2xl border border-sand-deep bg-white p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Paid out</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-ink">{formatUsd(paidUsd)}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-ink">Sales report</h2>
            <Link href="/agent/bookings" className="text-sm font-semibold text-teal hover:underline">
              View full report →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
