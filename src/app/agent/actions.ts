"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, phone, signup_kind: "agent" },
      // Without this, Supabase's "Confirm signup" email falls back to
      // its dashboard-configured Site URL (localhost in dev) instead
      // of wherever this app is actually deployed.
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/agent`,
    },
  });

  if (signUpError || !signedUp.user) {
    fail(signUpError?.message ?? "Couldn't create your account.");
  }

  // signUp() only returns a session if this project doesn't require
  // email confirmation. If it does, there's no session to land them in
  // /agent with -- say so instead of silently bouncing them to
  // /agent/login with no explanation.
  if (!signedUp.session) {
    redirect(
      `/agent/login?notice=${encodeURIComponent(
        "Registration received! Check your email to confirm your account, then sign in."
      )}`
    );
  }

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
