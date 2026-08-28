import type { CommissionTier } from "./types";

/** The highest tier an agent with this many *confirmed* referrals
 * qualifies for -- shared by the webhook (stamps commission on a
 * booking) and the agent dashboard (shows current standing), so the
 * "which tier am I in" logic only lives in one place. */
export function resolveCommissionTier(
  tiers: CommissionTier[],
  confirmedReferralCount: number
): CommissionTier | null {
  return (
    [...tiers]
      .sort((a, b) => b.min_referrals - a.min_referrals)
      .find((t) => confirmedReferralCount >= t.min_referrals) ?? null
  );
}

/** The next tier up from where an agent currently stands, or null if
 * they're already at the top -- powers the "N more referrals to reach
 * Growth" nudge on their dashboard. */
export function nextCommissionTier(
  tiers: CommissionTier[],
  confirmedReferralCount: number
): CommissionTier | null {
  const higherTiers = tiers.filter((t) => t.min_referrals > confirmedReferralCount);
  if (higherTiers.length === 0) return null;
  return higherTiers.reduce((closest, t) => (t.min_referrals < closest.min_referrals ? t : closest));
}

export interface MonthlyEarning {
  /** e.g. "Mar 2026" -- unique across years so a 12+ month history never
   * collides two Marches into one bucket. */
  key: string;
  /** e.g. "Mar" -- what's actually printed under the bar; the year only
   * shows up via the key/order, keeping the chart uncluttered. */
  label: string;
  totalUsd: number;
  bookingCount: number;
}

/** Buckets an agent's referred, confirmed bookings into the trailing
 * `monthsBack` calendar months (oldest first, current month last) for
 * the dashboard's earnings-over-time bar chart. Uses UTC month
 * boundaries off `created_at` so it doesn't depend on server timezone,
 * and always returns one entry per month -- including zero-earning
 * months -- so the chart's x-axis never skips a gap. */
export function monthlyEarnings(
  rows: Array<{ created_at: string; commission_amount_usd: number | null }>,
  monthsBack = 6
): MonthlyEarning[] {
  const now = new Date();
  const buckets = new Map<string, MonthlyEarning>();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    buckets.set(key, {
      key,
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      totalUsd: 0,
      bookingCount: 0,
    });
  }
  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue; // outside the trailing window
    bucket.totalUsd += row.commission_amount_usd ?? 0;
    bucket.bookingCount += 1;
  }
  return [...buckets.values()];
}
