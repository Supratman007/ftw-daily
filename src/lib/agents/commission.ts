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
