"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { generateReferralCode } from "@/lib/agents/referralCode";

/**
 * Self-service agent registration. Uses auth.signUp() same as the
 * customer signupAction in /login/actions.ts, but the sales_agents row
 * insert goes through the service-role client rather than the
 * session's own client: if this Supabase project requires email
 * confirmation, signUp() returns a user with no session yet, so an
 * insert on the session client would run unauthenticated and get
 * rejected by RLS ("new row violates row-level security policy") --
 * service role sidesteps that entirely, same as the staff-invite flow
 * in admin/team/actions.ts.
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
  const serviceClient = createSupabaseServiceRoleClient();
  let insertError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await serviceClient.from("sales_agents").insert({
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
