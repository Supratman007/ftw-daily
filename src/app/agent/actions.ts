"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { sendNewAgentStaffEmail } from "@/lib/email/resend";

/**
 * Self-service agent registration. The sales_agents row itself is
 * created by a database trigger on auth.users (migration 0010),
 * triggered by signup_kind: "agent" in this signUp() call's metadata
 * -- it runs in the same transaction as the new auth user, so by the
 * time signUp() returns the row is guaranteed to already exist.
 *
 * An earlier version inserted the row from here, immediately after
 * signUp() -- on a project that requires email confirmation, that ran
 * into a real race (the new auth.users row wasn't always visible yet
 * to that separate insert) and failed every time with "violates
 * foreign key constraint sales_agents_id_fkey". A trigger is the
 * pattern Supabase itself recommends for exactly this.
 *
 * No email-confirmation step here -- Confirm email is off project-wide
 * (Supabase's own "Confirm signup" mailer turned out to be unreliable
 * with custom SMTP, unrelated to anything in this app's config). An
 * admin reviewing and approving the application at /admin/agents is
 * the actual gate before the referral link goes live, so staff get
 * notified by email instead of the applicant needing to confirm one.
 */
export async function registerAgentAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  function fail(message: string): never {
    redirect(`/agent/register?error=${encodeURIComponent(message)}`);
  }

  if (!name || !email || !password) {
    fail("Name, email, and password are required.");
  }
  if (password.length < 6) {
    fail("Password must be at least 6 characters.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, phone, signup_kind: "agent" } },
  });

  if (signUpError || !signedUp.user) {
    fail(signUpError?.message ?? "Couldn't create your account.");
  }

  // Service role: this new agent's own session can't read admin_users
  // (RLS only allows admins to read that table) or is guaranteed to
  // see the trigger-created sales_agents row yet from a plain select
  // under RLS timing -- bypass both concerns the same way the booking
  // webhook does for its own staff notification.
  const serviceClient = createSupabaseServiceRoleClient();
  const [{ data: staff }, { data: agentRow }] = await Promise.all([
    serviceClient.from("admin_users").select("email").eq("status", "active"),
    serviceClient.from("sales_agents").select("referral_code").eq("id", signedUp.user.id).maybeSingle(),
  ]);

  await Promise.all(
    (staff ?? []).map((admin) =>
      sendNewAgentStaffEmail({
        toEmail: admin.email,
        agentName: name,
        agentEmail: email,
        agentPhone: phone || null,
        referralCode: agentRow?.referral_code ?? "—",
      })
    )
  );

  redirect("/agent");
}

export async function agentLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/agent/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/agent");
}

export async function agentLogoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/agent/login");
}
