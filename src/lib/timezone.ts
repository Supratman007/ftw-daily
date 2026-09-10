/** Lombok/WITA is a fixed UTC+8 offset year-round -- Indonesia doesn't
 * observe daylight saving -- so a plain constant is safe here, unlike
 * most timezones. Shared by the booking lead-time helpers
 * (src/lib/products/leadTime.ts) and anything else that needs to
 * reason about "today" or "midnight" in the business's own timezone
 * rather than the server's (Vercel runs in UTC). */
export const BUSINESS_TIMEZONE_OFFSET = "+08:00";

/** Today's calendar date (YYYY-MM-DD) in Lombok time. */
export function lombokDateString(instant: Date = new Date()): string {
  return new Date(instant.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Today's, tomorrow's, and the day-after-tomorrow's calendar dates
 * (Lombok time), computed together from one `new Date()` call --
 * needed anywhere that wants "today + tomorrow" (the pickups list,
 * the dashboard's today-only pickup count) without calling
 * `Date.now()`/`new Date()` directly in a page component's own body,
 * which React's purity lint rule flags. */
export function lombokTodayAndTomorrow(): {
  todayStr: string;
  tomorrowStr: string;
  dayAfterTomorrowStr: string;
} {
  const now = new Date();
  return {
    todayStr: lombokDateString(now),
    tomorrowStr: lombokDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
    dayAfterTomorrowStr: lombokDateString(new Date(now.getTime() + 48 * 60 * 60 * 1000)),
  };
}
