import "server-only";

/**
 * Verifies a reCAPTCHA v2 token server-side against Google's
 * siteverify endpoint. The secret key is deliberately never a
 * hardcoded fallback (unlike RECAPTCHA_SITE_KEY in lib/recaptcha.ts)
 * -- it must be set as RECAPTCHA_SECRET_KEY in Vercel's environment
 * variables (never pasted into chat/code, same rule as every other
 * secret this app uses).
 *
 * Soft-fails (returns true, i.e. "allow the booking through") rather
 * than throwing or blocking checkout if RECAPTCHA_SECRET_KEY isn't
 * set yet, or if the request to Google itself fails/times out -- same
 * "a verification hiccup should never break checkout" reasoning as
 * sendEmail() in lib/email/resend.ts. This means reCAPTCHA isn't
 * actually protecting anything until the secret is configured; that's
 * intentional and logged, not silent.
 */
export async function verifyRecaptcha(token: string | null): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not configured -- skipping reCAPTCHA verification");
    return true;
  }
  if (!token) {
    return false;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(`reCAPTCHA verify failed (HTTP ${response.status})`);
      return true;
    }
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("reCAPTCHA verify request failed:", err);
    return true;
  }
}
