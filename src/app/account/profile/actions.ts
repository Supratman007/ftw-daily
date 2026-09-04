"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Email is deliberately not editable here -- changing it needs
 * Supabase's own email-change confirmation flow (a second verification
 * step), which is more than this pass needs; name/phone cover what
 * spec §6h calls Phase 1 for Profile. */
export async function updateProfileAction(formData: FormData) {
  const customer = await requireCustomer("/account/profile");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    redirect(`/account/profile?error=${encodeURIComponent("Name is required.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({ name, phone: phone || null })
    .eq("id", customer.id);

  if (error) {
    redirect(`/account/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/account/profile?saved=1");
}

/** Verifies the current password by actually signing in with it (Supabase
 * has no separate "check this password" endpoint) before accepting a
 * new one -- without that check, anyone who found an already-logged-in
 * browser (a shared/public computer, an unlocked phone) could lock the
 * real owner out just by knowing this page exists. */
export async function changePasswordAction(formData: FormData) {
  const customer = await requireCustomer("/account/profile");
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  function fail(message: string): never {
    redirect(`/account/profile?password_error=${encodeURIComponent(message)}`);
  }

  if (newPassword.length < 6) {
    fail("New password must be at least 6 characters.");
  }
  if (newPassword !== confirmPassword) {
    fail("New passwords don't match.");
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: customer.email,
    password: currentPassword,
  });
  if (verifyError) {
    fail("Current password is incorrect.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    fail(error.message);
  }

  redirect("/account/profile?password_saved=1");
}
