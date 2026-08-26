"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeReturnTo(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? "");
  // Only ever redirect back into our own app -- an absolute or
  // protocol-relative URL here would let someone craft a login link
  // that sends a customer somewhere else after they sign in.
  // Falls back to Home, not an account dashboard -- that page doesn't
  // exist yet in this build (spec §6i's dashboard-on-proactive-login
  // behavior is a later step; for now there's nowhere else sensible to
  // land someone who signed in with no booking in progress).
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const returnTo = safeReturnTo(formData.get("return_to"));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });

  if (error) {
    redirect(
      `/login?mode=signup&return_to=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(returnTo);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnTo(formData.get("return_to"));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?return_to=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(returnTo);
}
