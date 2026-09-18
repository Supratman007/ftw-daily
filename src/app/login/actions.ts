"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";

const RATE_LIMITED_MESSAGE = {
  en: "Too many attempts from this connection. Please wait a few minutes and try again.",
  id: "Terlalu banyak percobaan dari koneksi ini. Silakan tunggu beberapa menit lalu coba lagi.",
} as const;

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

/** A hidden field on the login form (see LoginPage) carries forward
 * whichever locale the visitor was already on, same "carry it through
 * every redirect" approach as checkout -- only matters for the
 * error/notice redirects back to this same form; the final success
 * redirect just uses `returnTo`, which already has its own correct
 * prefix baked in from wherever the customer came from. */
function loginPathFor(formData: FormData): string {
  return formData.get("locale") === "id" ? "/id/login" : "/login";
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const returnTo = safeReturnTo(formData.get("return_to"));
  const loginPath = loginPathFor(formData);
  const locale = formData.get("locale") === "id" ? "id" : "en";

  // Signup is the one form this app has actually seen abused -- a
  // flood of fake signups, each one firing a real "confirm your
  // email" send. Stricter and longer-windowed than the other forms
  // below on purpose. See src/lib/rateLimit.ts.
  if (!(await checkRateLimit("signup", 5, 60))) {
    redirect(
      `${loginPath}?mode=signup&return_to=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(
        RATE_LIMITED_MESSAGE[locale]
      )}`
    );
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: signedUp, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
      // Without this, Supabase's "Confirm signup" email falls back to
      // its dashboard-configured Site URL (localhost in dev) instead
      // of wherever this app is actually deployed.
      emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(returnTo)}`,
    },
  });

  if (error) {
    redirect(
      `${loginPath}?mode=signup&return_to=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(error.message)}`
    );
  }

  // signUp() only returns a session if this project doesn't require
  // email confirmation. If it does, redirecting straight to returnTo
  // would look like signup worked but leave them not actually logged
  // in -- say so instead.
  if (!signedUp.session) {
    redirect(
      `${loginPath}?return_to=${encodeURIComponent(returnTo)}&notice=${encodeURIComponent(
        "Almost there! Check your email to confirm your account, then sign in."
      )}`
    );
  }

  redirect(returnTo);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnTo(formData.get("return_to"));
  const loginPath = loginPathFor(formData);
  const locale = formData.get("locale") === "id" ? "id" : "en";

  // Looser than signup (mistyped passwords are a normal occurrence)
  // but still caps credential-stuffing floods. See rateLimit.ts.
  if (!(await checkRateLimit("login", 10, 15))) {
    redirect(
      `${loginPath}?return_to=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(
        RATE_LIMITED_MESSAGE[locale]
      )}`
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`${loginPath}?return_to=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(returnTo);
}
