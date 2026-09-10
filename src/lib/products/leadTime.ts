import { BUSINESS_TIMEZONE_OFFSET } from "@/lib/timezone";

/** Booking lead-time cutoff (how soon before a trip/pickup we still
 * accept a new online booking) -- shared by the instant-book checkout,
 * the Rinjani-style request flow, and the self-service pickup-time
 * change, so the three don't quietly drift apart. */

/** Default `products.min_lead_hours` for a brand-new product, before
 * an admin sets one deliberately. Matches the value the 0036 migration
 * backfilled onto every existing row. */
export const DEFAULT_MIN_LEAD_HOURS = 10;

/** The instant a date-only product's trip "starts" -- midnight at the
 * start of the selected date, in Lombok time. Used for Tours,
 * Activities, and the Rinjani-style request flow, none of which
 * collect a specific start *time*, only a date. */
export function tripStartFromDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00${BUSINESS_TIMEZONE_OFFSET}`);
}

/** The precise pickup moment, in Lombok time, for Car Hire/Transport,
 * which collect both a date and a time. Always construct a pickup
 * datetime through this helper rather than `new Date(`${d}T${t}:00`)`
 * directly -- without an explicit offset, that parses as the server's
 * own local time (UTC on Vercel), which silently shifts every pickup
 * by 8 hours. */
export function pickupDatetimeInBusinessTimezone(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00${BUSINESS_TIMEZONE_OFFSET}`);
}

/** True if `tripStart` is at least `minLeadHours` away from right now. */
export function hasEnoughLeadTime(tripStart: Date, minLeadHours: number): boolean {
  return tripStart.getTime() - Date.now() >= minLeadHours * 60 * 60 * 1000;
}

/** The earliest calendar date (YYYY-MM-DD, Lombok time) whose midnight
 * start is still at least `minLeadHours` away from right now -- i.e.
 * the first date `tripStartFromDate` would accept. Used to set the
 * date picker's `min` on date-only products (Tours, Activities, the
 * Rinjani-style request form) so the calendar itself only ever offers
 * dates the server will actually accept, instead of relying on the
 * customer to hit a rejection message after picking one that's too
 * soon. */
export function earliestBookableDate(minLeadHours: number): string {
  const thresholdMs = Date.now() + minLeadHours * 60 * 60 * 1000;
  // Shift the threshold instant into Lombok wall-clock time, then read
  // its date/time parts as UTC -- sidesteps relying on the server's
  // own timezone (Vercel runs in UTC, but this works regardless).
  const shifted = new Date(thresholdMs + 8 * 60 * 60 * 1000);
  const base = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  );
  // If the threshold falls after local midnight, that calendar day's
  // own midnight is already too early -- the next day is the first one
  // that clears the bar.
  const fallsAfterMidnight =
    shifted.getUTCHours() || shifted.getUTCMinutes() || shifted.getUTCSeconds() || shifted.getUTCMilliseconds();
  if (fallsAfterMidnight) {
    base.setUTCDate(base.getUTCDate() + 1);
  }
  return base.toISOString().slice(0, 10);
}
