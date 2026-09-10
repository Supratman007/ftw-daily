"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

/** Email is deliberately not editable here -- changing it needs
 * Supabase's own email-change confirmation flow (a second verification
 * step), which is more than this pass needs; name/phone cover what
 * spec §6h calls Phase 1 for Profile. `locale` is bound by ProfilePage
 * (it already knows which locale rendered the form), so every redirect
 * here -- success or error -- keeps the visitor in that language. Any
 * error message straight from Supabase itself (error.message) stays in
 * English -- there's no reasonable way to translate a third-party
 * service's own error text. */
export async function updateProfileAction(locale: Locale, formData: FormData) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const dict = getDictionary(locale).account.errors;
  const customer = await requireCustomer(`${pathPrefix}/account/profile`);
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    redirect(`${pathPrefix}/account/profile?error=${encodeURIComponent(dict.nameRequired)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({ name, phone: phone || null })
    .eq("id", customer.id);

  if (error) {
    redirect(`${pathPrefix}/account/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${pathPrefix}/account/profile?saved=1`);
}

/** Verifies the current password by actually signing in with it (Supabase
 * has no separate "check this password" endpoint) before accepting a
 * new one -- without that check, anyone who found an already-logged-in
 * browser (a shared/public computer, an unlocked phone) could lock the
 * real owner out just by knowing this page exists. */
export async function changePasswordAction(locale: Locale, formData: FormData) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const dict = getDictionary(locale).account.errors;
  const customer = await requireCustomer(`${pathPrefix}/account/profile`);
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  function fail(message: string): never {
    redirect(`${pathPrefix}/account/profile?password_error=${encodeURIComponent(message)}`);
  }

  if (newPassword.length < 6) {
    fail(dict.passwordTooShort);
  }
  if (newPassword !== confirmPassword) {
    fail(dict.passwordsDontMatch);
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: customer.email,
    password: currentPassword,
  });
  if (verifyError) {
    fail(dict.currentPasswordIncorrect);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    fail(error.message);
  }

  redirect(`${pathPrefix}/account/profile?password_saved=1`);
}
