import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/locales";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Kept in sync by requireCustomer itself on every call (see below)
   * -- transactional emails (sent from webhooks/cron with no page
   * request to read a locale from) use this to pick a language. */
  preferred_locale: Locale;
}

/**
 * Returns the logged-in customer's profile. If nobody's logged in,
 * redirects to /login -- pass `returnTo` (the page the visitor was
 * trying to reach) so they land back there right after signing in,
 * per spec §6i's "return_to" behavior, instead of losing their place.
 *
 * Creates the `customers` row on first use if it doesn't exist yet
 * (right after signup, before anyone's actually booked anything) rather
 * than at signup time itself -- someone can have an account without
 * ever reaching checkout.
 */
export const requireCustomer = cache(async (returnTo?: string): Promise<Customer> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // returnTo already carries an /id prefix when the visitor was
  // browsing in Indonesian (every locale-aware page builds it that
  // way) -- this is the only signal requireCustomer has for which
  // language the current request is in, so it doubles as both the
  // login-redirect language below and the preferred_locale kept in
  // sync further down.
  const locale: Locale = returnTo === "/id" || returnTo?.startsWith("/id/") ? "id" : "en";

  if (!user) {
    const loginPath = locale === "id" ? "/id/login" : "/login";
    redirect(returnTo ? `${loginPath}?return_to=${encodeURIComponent(returnTo)}` : "/login");
  }

  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, email, phone, preferred_locale")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    // Keeps preferred_locale current with whichever language this
    // customer is actually browsing in right now -- same "last active
    // language wins" philosophy as the site_locale cookie, just
    // persisted server-side since transactional emails are sent from
    // webhooks/cron with no page request to read a cookie from.
    // Best-effort: never blocks or fails the page over it.
    if (existing.preferred_locale !== locale) {
      await supabase.from("customers").update({ preferred_locale: locale }).eq("id", user.id);
      existing.preferred_locale = locale;
    }
    return existing as Customer;
  }

  const name = (user.user_metadata?.full_name as string | undefined) || user.email || "Customer";
  const phone = (user.user_metadata?.phone as string | undefined) ?? null;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({ id: user.id, name, email: user.email ?? "", phone, preferred_locale: locale })
    .select("id, name, email, phone, preferred_locale")
    .single();

  if (error || !created) {
    throw new Error(`Could not create customer profile: ${error?.message}`);
  }
  return created as Customer;
});
