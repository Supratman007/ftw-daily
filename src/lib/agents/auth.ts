import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SalesAgent } from "./types";

/**
 * Returns the logged-in Sales Agent's row, whatever their status is --
 * unlike requireAdmin() this does NOT sign out or reject a non-active
 * agent, because "pending" is an expected, common state right after
 * registering (they need to see a "waiting for approval" message, not
 * get bounced). Callers branch on `status` themselves.
 *
 * Pass `returnTo` (the full path + query the visitor was trying to
 * reach) when the destination itself carries state that would
 * otherwise be lost across a login redirect -- e.g. a bank-change
 * confirm link's one-time token. agentLoginAction sends them back
 * there after signing in instead of always landing on /agent.
 */
export const requireAgent = cache(async (returnTo?: string): Promise<SalesAgent> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(returnTo ? `/agent/login?next=${encodeURIComponent(returnTo)}` : "/agent/login");
  }

  const { data: agent } = await supabase
    .from("sales_agents")
    .select(
      "id, name, email, phone, referral_code, status, agent_type, pic_name, pic_phone, id_document_path, business_document_path, bank_name, bank_account_number, bank_account_holder, bank_change_requested_at, created_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!agent) {
    // A real Supabase login that isn't a registered agent at all.
    await supabase.auth.signOut();
    redirect("/agent/login?error=" + encodeURIComponent("That account isn't a registered agent."));
  }

  return agent as SalesAgent;
});
