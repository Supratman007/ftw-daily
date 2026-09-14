/**
 * The public half of the reCAPTCHA key pair -- safe to ship in
 * client-side HTML (that's what a site key is for), so this lives as
 * a real default rather than requiring an env var, same "confirmed
 * real value" pattern as WHATSAPP_NUMBER in lib/contact.ts. Override
 * via env var if it's ever rotated.
 *
 * Deliberately plain/client-safe (no "server-only", no other import)
 * -- the Recaptcha widget component that reads this is a "use client"
 * component. The *secret* key and verifyRecaptcha() live in the
 * separate, actually server-only lib/recaptchaVerify.ts -- same
 * currency.ts/exchangeRate.ts split, and for the same reason:
 * importing a server-only module from a client component breaks the
 * build.
 */
export const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6Lc6cH4tAAAAAGQoZDVMGZyOb_o5mcUVxOZNcl0f";
