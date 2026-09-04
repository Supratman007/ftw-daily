/**
 * WordPress gives us prices in USD. Xendit charges in IDR. Rather than
 * storing an IDR price (which would go stale the moment the rate moves),
 * we store USD only and compute IDR here, on the fly, from one constant.
 *
 * To update the rate: change this one number. Nothing else needs to
 * change -- every page and every future checkout reads from here.
 */
export const USD_TO_IDR_RATE = 17000;

/** Rounds to the nearest 1,000 IDR -- Indonesian prices are never shown
 * with more precision than that, and it avoids ugly numbers like
 * Rp 1,479,999 from a straight multiplication. */
export function usdToIdr(usd: number): number {
  return Math.round((usd * USD_TO_IDR_RATE) / 1000) * 1000;
}

/** The reverse of usdToIdr -- needed for Car Hire/Transport, where the
 * admin enters the real price in IDR directly (a price grid, not a
 * per-person USD rate) but discount codes and commission are still
 * tracked in USD like every other product. */
export function idrToUsd(idr: number): number {
  return idr / USD_TO_IDR_RATE;
}

export function formatUsd(usd: number): string {
  return `$${usd.toLocaleString("en-US")}`;
}

export function formatIdr(idr: number): string {
  return `Rp ${idr.toLocaleString("id-ID")}`;
}
