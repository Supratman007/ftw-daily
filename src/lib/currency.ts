/**
 * WordPress gives us prices in USD. Xendit charges in IDR. Rather than
 * storing an IDR price (which would go stale the moment the rate moves),
 * we store USD only and compute IDR here, on the fly, from one rate.
 *
 * This constant is now only the *fallback* -- used if the app_settings
 * row (see migration 0046) is ever missing or the query fails, so a
 * database hiccup never breaks pricing site-wide. The real, current
 * rate lives in the database and is admin-editable at /admin/settings
 * -- see getUsdToIdrRate() in lib/exchangeRate.ts (a separate,
 * server-only file: this one stays plain/client-safe, since
 * usdToIdr/formatIdr are also called from client components like
 * TransportBookingForm, and pulling in the Supabase server client here
 * would break their bundle).
 */
export const DEFAULT_USD_TO_IDR_RATE = 17000;

/** Rounds to the nearest 1,000 IDR -- Indonesian prices are never shown
 * with more precision than that, and it avoids ugly numbers like
 * Rp 1,479,999 from a straight multiplication.
 *
 * `rate` defaults to the fallback constant rather than being silently
 * hardcoded -- call sites that price something a customer is about to
 * pay should always pass the live rate from getUsdToIdrRate() instead
 * of relying on this default. */
export function usdToIdr(usd: number, rate: number = DEFAULT_USD_TO_IDR_RATE): number {
  return Math.round((usd * rate) / 1000) * 1000;
}

/** The reverse of usdToIdr -- needed for Car Hire/Transport, where the
 * admin enters the real price in IDR directly (a price grid, not a
 * per-person USD rate) but discount codes and commission are still
 * tracked in USD like every other product. Same "pass the live rate
 * in" story as usdToIdr. */
export function idrToUsd(idr: number, rate: number = DEFAULT_USD_TO_IDR_RATE): number {
  return idr / rate;
}

export function formatUsd(usd: number): string {
  return `$${usd.toLocaleString("en-US")}`;
}

export function formatIdr(idr: number): string {
  return `Rp ${idr.toLocaleString("id-ID")}`;
}
