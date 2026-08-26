import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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

  if (!user) {
    redirect(returnTo ? `/login?return_to=${encodeURIComponent(returnTo)}` : "/login");
  }

  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing as Customer;

  const name = (user.user_metadata?.full_name as string | undefined) || user.email || "Customer";
  const phone = (user.user_metadata?.phone as string | undefined) ?? null;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({ id: user.id, name, email: user.email ?? "", phone })
    .select("id, name, email, phone")
    .single();

  if (error || !created) {
    throw new Error(`Could not create customer profile: ${error?.message}`);
  }
  return created as Customer;
});
