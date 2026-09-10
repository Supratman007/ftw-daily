"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

/** `locale` is bound by ForgotPasswordPage -- see that component's doc
 * comment for why this only actually matters for a customer. */
export async function requestPasswordResetAction(locale: Locale, formData: FormData) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const dict = getDictionary(locale).passwordReset.errors;
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`${pathPrefix}/forgot-password?error=${encodeURIComponent(dict.pleaseEnterEmail)}`);
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=${pathPrefix}/reset-password`,
  });

  // Always shows the same "check your email" message whether or not
  // that address actually has an account -- confirming/denying an email
  // exists here would let someone enumerate registered customers.
  redirect(`${pathPrefix}/forgot-password?sent=1`);
}
