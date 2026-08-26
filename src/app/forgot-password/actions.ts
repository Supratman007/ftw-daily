"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Please enter your email.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  // Always shows the same "check your email" message whether or not
  // that address actually has an account -- confirming/denying an email
  // exists here would let someone enumerate registered customers.
  redirect("/forgot-password?sent=1");
}
