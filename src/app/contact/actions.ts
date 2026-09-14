"use server";

import { redirect } from "next/navigation";
import { sendContactFormEmail } from "@/lib/email/resend";
import { SUPPORT_EMAIL } from "@/lib/contact";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The public Contact page's only server-side effect -- validates,
 * emails SUPPORT_EMAIL (via sendContactFormEmail), and redirects back
 * with a plain success/error flag. No account, no database row --
 * this is a one-way message, not something either side needs to look
 * up again later.
 *
 * `website` is a honeypot field -- hidden from real visitors with CSS
 * (see ContactPage.tsx) but visible to most bots that blindly fill in
 * every field on a form. A non-empty value here means it's very
 * likely a bot, so this pretends to succeed (redirects to the same
 * "sent" page a real visitor would see) rather than telling it it was
 * caught, without actually sending the email. Cheap, no external
 * service or API key needed -- reCAPTCHA is a separate, larger
 * follow-up if this alone isn't enough.
 */
export async function submitContactFormAction(locale: "en" | "id", formData: FormData) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const contactPath = `${pathPrefix}/contact`;

  const website = String(formData.get("website") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (website) {
    // Honeypot tripped -- pretend it worked, send nothing.
    redirect(`${contactPath}?sent=1`);
  }

  const errors: string[] = [];
  if (!name) errors.push(locale === "id" ? "Nama wajib diisi." : "Name is required.");
  if (!email || !EMAIL_RE.test(email)) {
    errors.push(locale === "id" ? "Masukkan alamat email yang valid." : "Enter a valid email address.");
  }
  if (!message || message.length < 10) {
    errors.push(
      locale === "id"
        ? "Pesan minimal 10 karakter."
        : "Message must be at least 10 characters."
    );
  }

  if (errors.length > 0) {
    redirect(`${contactPath}?error=${encodeURIComponent(errors.join(" "))}`);
  }

  await sendContactFormEmail({ toEmail: SUPPORT_EMAIL, name, fromEmail: email, message });

  redirect(`${contactPath}?sent=1`);
}
