/**
 * Where a gift voucher recipient (or anyone else with no account on
 * this app) actually reaches Adventure Lombok. There was previously no
 * such constant anywhere -- the voucher email just said "contact us"
 * with nothing to contact. SUPPORT_EMAIL always has a value; WhatsApp
 * is optional and simply doesn't render anywhere it's not set, so it
 * can be turned on later (Vercel env var, no code change) once there's
 * a real business number.
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "info@adventure-lombok.com";

// Digits only, country code first, no "+" or spaces (e.g. "6281234567890")
// -- that's the format wa.me links expect.
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || null;

export function whatsappLink(message: string): string | null {
  if (!WHATSAPP_NUMBER) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
