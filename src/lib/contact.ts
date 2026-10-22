/**
 * Where a gift voucher recipient (or anyone else with no account on
 * this app) actually reaches Adventure Lombok. There was previously no
 * such constant anywhere -- the voucher email just said "contact us"
 * with nothing to contact. Both default to real values below; override
 * either via a Vercel env var if they ever change, no code change
 * needed.
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "info@adventure-lombok.com";

// Digits only, country code first, no "+" or spaces (e.g. "6281234567890")
// -- that's the format wa.me links expect. Defaults to Adventure
// Lombok's real number; override via env var if it ever changes.
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6281803747576";

export function whatsappLink(message: string): string | null {
  if (!WHATSAPP_NUMBER) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** A plain "call us" link, distinct from whatsappLink above -- some
 * visitors would rather dial than open WhatsApp. Reuses the same
 * number (it's a real phone as well as a WhatsApp number). */
export const PHONE_LINK = `tel:+${WHATSAPP_NUMBER}`;

/**
 * Social links for the site footer -- unset (undefined) unless a real
 * URL is configured via a Vercel env var, same "no fabricated contact
 * info" reasoning as everything else in this file. SiteFooter only
 * renders an icon for whichever of these are actually set, so adding
 * one later needs an env var, not a code change.
 */
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || undefined;
export const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || undefined;
export const TIKTOK_URL = process.env.NEXT_PUBLIC_TIKTOK_URL || undefined;
