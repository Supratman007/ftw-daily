"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

/** `locale` is bound by ResetPasswordPage. Only the error redirects and
 * the final customer-only redirect are locale-aware -- staff/agents
 * only ever reach this in English, so their two redirects below stay
 * hardcoded English regardless of what locale was bound. */
export async function resetPasswordAction(locale: Locale, formData: FormData) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const dict = getDictionary(locale).passwordReset.errors;
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 6) {
    redirect(`${pathPrefix}/reset-password?error=${encodeURIComponent(dict.passwordTooShort)}`);
  }
  if (password !== confirmPassword) {
    redirect(`${pathPrefix}/reset-password?error=${encodeURIComponent(dict.passwordsDontMatch)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error, data } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`${pathPrefix}/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  // Updating the password while on the recovery session leaves the
  // person logged in for real -- no need to send them back through
  // /login. This flow is shared by customers (forgot password), staff
  // (accepting a team invite, or their own forgot password), and Sales
  // Agents (same) -- check admin_users / sales_agents so each lands on
  // their own dashboard instead of the customer account area, with a
  // plain confirmation either way since nothing else here tells them
  // the password actually changed.
  const [{ data: admin }, { data: agent }] = await Promise.all([
    supabase.from("admin_users").select("id").eq("id", data.user.id).maybeSingle(),
    supabase.from("sales_agents").select("id").eq("id", data.user.id).maybeSingle(),
  ]);

  if (admin) {
    redirect("/admin?password_set=1");
  }
  if (agent) {
    redirect("/agent?password_set=1");
  }
  redirect(`${pathPrefix}/account?password_reset=1`);
}
