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
  const { error, data } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  // Updating the password while on the recovery session leaves the
  // person logged in for real -- no need to send them back through
  // /login. This flow is shared by customers (forgot password) and
  // staff (accepting a team invite, or their own forgot password) --
  // check admin_users so staff land on their own dashboard instead of
  // the customer account area, with a plain confirmation either way
  // since nothing else here tells them the password actually changed.
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(admin ? "/admin?password_set=1" : "/account?password_reset=1");
}
