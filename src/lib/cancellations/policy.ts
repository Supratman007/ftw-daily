import type { CancellationPolicyTier } from "./types";

/** Days between today and the trip date, calendar-date arithmetic only
 * (bookings only ever store a date, not a time) -- 0 or negative means
 * departure is today or already past (a no-show), which is exactly
 * the implicit 0% floor spec §6f describes. */
export function daysBeforeDeparture(slotDate: string, today: string): number {
  const departure = Date.UTC(...(parseIsoDate(slotDate)));
  const now = Date.UTC(...(parseIsoDate(today)));
  return Math.round((departure - now) / (24 * 60 * 60 * 1000));
}

function parseIsoDate(value: string): [number, number, number] {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return [year, month - 1, day];
}

/** The highest-qualifying tier for how many days out the trip is --
 * same resolution shape as resolveCommissionTier (agents/commission.ts):
 * sort by threshold descending, take the first one this qualifies for.
 * No qualifying tier (same-day or a no-show) falls through to the
 * spec's implicit 0% floor rather than needing its own row. */
export function resolveCancellationRefundPercent(
  tiers: CancellationPolicyTier[],
  daysOut: number
): number {
  const tier = [...tiers]
    .sort((a, b) => b.min_days_before_departure - a.min_days_before_departure)
    .find((t) => daysOut >= t.min_days_before_departure);
  return tier?.refund_percent ?? 0;
}
