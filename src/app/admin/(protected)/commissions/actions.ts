"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CommissionStatus } from "@/lib/agents/types";

/** Marks one booking's commission paid/pending -- the correction path
 * for a single row (e.g. undoing an accidental bulk mark-paid). Uses
 * the session client, relying on the admin UPDATE policy added in
 * 0015 rather than service-role, matching how every other admin write
 * in this app works. */
export async function setCommissionStatusAction(bookingId: string, status: CommissionStatus) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bookings")
    .update({ commission_status: status })
    .eq("id", bookingId);

  if (error) {
    redirect(`/admin/commissions?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/commissions?updated=1");
}

/** The actual "I just sent the wire transfer" action -- marks every
 * one of this agent's still-pending, confirmed-sale commissions paid
 * in one go, since a real payout is one bank transfer covering
 * everything owed, not booking-by-booking. */
export async function markAgentCommissionsPaidAction(agentId: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bookings")
    .update({ commission_status: "paid" })
    .eq("referred_by_agent_id", agentId)
    .eq("status", "paid_confirmed")
    .eq("commission_status", "pending");

  if (error) {
    redirect(`/admin/commissions?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/commissions?updated=1");
}
