import "server-only";
import QRCode from "qrcode";

/** PNG data URL of a QR code for the given link -- rendered server-side
 * (Server Component, no client JS needed) so an agent can screenshot or
 * print it for in-person sharing, not just copy-paste the URL. */
export async function generateReferralQrCodeDataUrl(link: string): Promise<string> {
  return QRCode.toDataURL(link, { width: 200, margin: 1 });
}
