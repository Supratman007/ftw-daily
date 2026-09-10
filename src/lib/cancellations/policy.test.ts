import { describe, expect, it } from "vitest";
import { daysBeforeDeparture, resolveCancellationRefundPercent } from "./policy";
import type { CancellationPolicyTier } from "./types";

// Spec §13's same "real money needs test coverage" reasoning applies
// here: this is the exact math that decides how much of a customer's
// payment gets refunded when they cancel.

function tier(min_days_before_departure: number, refund_percent: number): CancellationPolicyTier {
  return { id: `${min_days_before_departure}d`, min_days_before_departure, refund_percent };
}

describe("daysBeforeDeparture", () => {
  it("counts whole calendar days between today and the trip date", () => {
    expect(daysBeforeDeparture("2026-09-20", "2026-09-10")).toBe(10);
  });

  it("returns 0 for a same-day departure", () => {
    expect(daysBeforeDeparture("2026-09-10", "2026-09-10")).toBe(0);
  });

  it("returns a negative number for a no-show (trip date already past)", () => {
    expect(daysBeforeDeparture("2026-09-05", "2026-09-10")).toBe(-5);
  });

  it("ignores any time-of-day component, using calendar dates only", () => {
    expect(daysBeforeDeparture("2026-09-20T23:59:00Z", "2026-09-10T00:00:00Z")).toBe(10);
  });

  it("is unaffected by DST -- always exactly 1 day across a month boundary", () => {
    expect(daysBeforeDeparture("2026-11-01", "2026-10-31")).toBe(1);
  });
});

describe("resolveCancellationRefundPercent", () => {
  const tiers: CancellationPolicyTier[] = [tier(2, 90), tier(1, 65)];

  it("gives the full published refund for a cancellation well in advance", () => {
    expect(resolveCancellationRefundPercent(tiers, 10)).toBe(90);
  });

  it("gives the exact threshold day's refund, not the one below it", () => {
    expect(resolveCancellationRefundPercent(tiers, 2)).toBe(90);
    expect(resolveCancellationRefundPercent(tiers, 1)).toBe(65);
  });

  it("falls through to the implicit 0% floor for a same-day cancellation", () => {
    expect(resolveCancellationRefundPercent(tiers, 0)).toBe(0);
  });

  it("falls through to the implicit 0% floor for a no-show (negative days out)", () => {
    expect(resolveCancellationRefundPercent(tiers, -3)).toBe(0);
  });

  it("returns 0% when no cancellation policy tiers are configured at all", () => {
    expect(resolveCancellationRefundPercent([], 30)).toBe(0);
  });

  it("is order-independent -- an admin can save tiers in any order", () => {
    const shuffled = [tiers[1], tiers[0]];
    expect(resolveCancellationRefundPercent(shuffled, 5)).toBe(90);
  });
});
