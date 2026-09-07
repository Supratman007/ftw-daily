/** Booking lead-time cutoff (how soon before a trip/pickup we still
 * accept a new online booking) -- shared by the instant-book checkout,
 * the Rinjani-style request flow, and the self-service pickup-time
 * change, so the three don't quietly drift apart.
 *
 * Lombok/WITA is a fixed UTC+8 offset year-round -- Indonesia doesn't
 * observe daylight saving -- so a plain constant is safe here, unlike
 * most timezones. */
const BUSINESS_TIMEZONE_OFFSET = "+08:00";

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
