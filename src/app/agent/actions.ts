"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateReferralCode } from "@/lib/agents/referralCode";

/**
 * Self-service agent registration. Mirrors the customer signupAction in
 * /login/actions.ts (auth.signUp(), then immediately usable -- this
 * project doesn't require email confirmation), but also creates the
 * sales_agents row that makes this a Sales Agent rather than a plain
 * customer account, with a generated referral code and status='pending'
 * until an admin approves them on /admin/agents.
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
    options: { data: { full_name: name, phone } },
  });

  if (signUpError || !signedUp.user) {
    fail(signUpError?.message ?? "Couldn't create your account.");
  }

  // Retry with a fresh code on the rare unique-constraint collision;
  // any other error isn't worth retrying.
  let insertError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from("sales_agents").insert({
      id: signedUp.user.id,
      name,
      email,
      phone: phone || null,
      referral_code: generateReferralCode(),
      status: "pending",
    });
    if (!error) {
      insertError = null;
      break;
    }
    insertError = error;
    if (error.code !== "23505") break;
  }

  if (insertError) {
    fail(`Account created, but couldn't finish registration: ${insertError.message}`);
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
