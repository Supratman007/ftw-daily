"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 6) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password must be at least 6 characters.")}`
    );
  }
  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords don't match.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  // Updating the password while on the recovery session leaves the
  // customer logged in for real -- no need to send them back through
  // /login.
  redirect("/");
}
