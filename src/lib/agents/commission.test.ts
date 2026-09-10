import { describe, expect, it } from "vitest";
import {
  formatCommissionAmount,
  monthlyEarnings,
  nextCommissionTier,
  resolveCommissionTier,
} from "./commission";
import type { CommissionTier } from "./types";

// Spec §13: "agent commission is real money -- attribution logic needs
// test coverage." These four functions decide which cut of a real
// payment an agent is owed and what their dashboard shows them they're
// owed, so a regression here is either a wrong bank transfer or a
// promise the app didn't keep.

function tier(name: string, min_referrals: number, commission_percent: number): CommissionTier {
  return { id: name, name, min_referrals, commission_percent, sort_order: min_referrals };
}

const tiers: CommissionTier[] = [
  tier("Starter", 0, 5),
  tier("Growth", 5, 8),
  tier("Elite", 15, 12),
];

describe("formatCommissionAmount", () => {
  it("converts USD to the IDR string an agent's bank actually sees", () => {
    // $10 * 17,000 = Rp 170,000
    expect(formatCommissionAmount(10)).toBe("Rp 170.000");
  });

  it("rounds to the nearest Rp 1,000 like every other price in the app", () => {
    // $1.2345 * 17,000 = 20,986.5 -> nearest 1,000 = Rp 21,000
    expect(formatCommissionAmount(1.2345)).toBe("Rp 21.000");
  });

  it("handles zero commission", () => {
    expect(formatCommissionAmount(0)).toBe("Rp 0");
  });
});

describe("resolveCommissionTier", () => {
  it("puts a brand-new agent (0 confirmed referrals) in the lowest tier", () => {
    expect(resolveCommissionTier(tiers, 0)?.name).toBe("Starter");
  });

  it("promotes an agent the moment they cross a threshold", () => {
    expect(resolveCommissionTier(tiers, 5)?.name).toBe("Growth");
    expect(resolveCommissionTier(tiers, 14)?.name).toBe("Growth");
    expect(resolveCommissionTier(tiers, 15)?.name).toBe("Elite");
  });

  it("keeps an agent in the top tier no matter how far past it they are", () => {
    expect(resolveCommissionTier(tiers, 500)?.name).toBe("Elite");
  });

  it("is order-independent -- an admin can save tiers in any order", () => {
    const shuffled = [tiers[2], tiers[0], tiers[1]];
    expect(resolveCommissionTier(shuffled, 10)?.name).toBe("Growth");
  });

  it("returns null when there are no tiers configured at all", () => {
    expect(resolveCommissionTier([], 10)).toBeNull();
  });
});

describe("nextCommissionTier", () => {
  it("points a new agent at the very first tier above zero", () => {
    expect(nextCommissionTier(tiers, 0)?.name).toBe("Growth");
  });

  it("points at the nearest higher tier, not the highest one", () => {
    expect(nextCommissionTier(tiers, 6)?.name).toBe("Elite");
  });

  it("returns null once an agent has already reached the top tier", () => {
    expect(nextCommissionTier(tiers, 15)).toBeNull();
    expect(nextCommissionTier(tiers, 1000)).toBeNull();
  });
});

describe("monthlyEarnings", () => {
  it("always returns exactly monthsBack buckets, even with zero rows", () => {
    const result = monthlyEarnings([], 3);
    expect(result).toHaveLength(3);
    expect(result.every((b) => b.totalUsd === 0 && b.bookingCount === 0)).toBe(true);
  });

  it("sums confirmed-booking commission into the correct calendar month", () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15)).toISOString();
    const result = monthlyEarnings(
      [
        { created_at: thisMonth, commission_amount_usd: 12 },
        { created_at: thisMonth, commission_amount_usd: 8 },
      ],
      3
    );
    const currentBucket = result[result.length - 1];
    expect(currentBucket.totalUsd).toBe(20);
    expect(currentBucket.bookingCount).toBe(2);
  });

  it("silently drops rows outside the trailing window rather than mis-bucketing them", () => {
    const now = new Date();
    const longAgo = new Date(Date.UTC(now.getUTCFullYear() - 5, now.getUTCMonth(), 1)).toISOString();
    const result = monthlyEarnings([{ created_at: longAgo, commission_amount_usd: 999 }], 3);
    expect(result.reduce((sum, b) => sum + b.totalUsd, 0)).toBe(0);
  });

  it("treats a null commission_amount_usd as zero instead of throwing or producing NaN", () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const result = monthlyEarnings([{ created_at: thisMonth, commission_amount_usd: null }], 1);
    expect(result[0].totalUsd).toBe(0);
    expect(result[0].bookingCount).toBe(1);
  });
});
