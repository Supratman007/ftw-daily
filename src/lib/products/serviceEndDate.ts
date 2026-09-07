/** A booking's last day of service -- `slot_date` plus the product's
 * `duration_days` (spec §6d: "for a 3-day Rinjani trek that's start
 * date + 2 days, for a single-day tour it's just the booking date").
 * Drives when the review-request email goes out (the day this date
 * arrives) -- computed once, at confirmation time, and stored on the
 * booking, so a later change to the product's duration never reaches
 * back and shifts an already-confirmed booking's review timing. */
export function computeServiceEndDate(slotDate: string, durationDays: number): string {
  const d = new Date(`${slotDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(1, durationDays) - 1);
  return d.toISOString().slice(0, 10);
}
