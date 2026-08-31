"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CommissionStatus } from "@/lib/agents/types";

const TABLE_BY_SOURCE = {
  booking: "bookings",
  gift_voucher: "gift_vouchers",
} as const;

/** Marks one commission-bearing row (a booking or, since gift purchases
 * can carry a referral too now, a gift voucher) paid/pending -- the
 * correction path for a single row (e.g. undoing an accidental bulk
 * mark-paid). Uses the session client, relying on the admin UPDATE
 * policy each table already has, matching how every other admin write
 * in this app works. */
export async function setCommissionStatusAction(
  rowId: string,
  source: "booking" | "gift_voucher",
  status: CommissionStatus
) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from(TABLE_BY_SOURCE[source])
    .update({ commission_status: status })
    .eq("id", rowId);

  if (error) {
    redirect(`/admin/commissions?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/commissions?updated=1");
}

/** The actual "I just sent the wire transfer" action -- marks every
 * one of this agent's still-pending, confirmed-sale commissions paid
 * in one go, across both bookings and gift vouchers, since a real
 * payout is one bank transfer covering everything owed, not
 * row-by-row. */
export async function markAgentCommissionsPaidAction(agentId: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const [{ error: bookingError }, { error: voucherError }] = await Promise.all([
    supabase
      .from("bookings")
      .update({ commission_status: "paid" })
      .eq("referred_by_agent_id", agentId)
      .eq("status", "paid_confirmed")
      .eq("commission_status", "pending"),
    supabase
      .from("gift_vouchers")
      .update({ commission_status: "paid" })
      .eq("referred_by_agent_id", agentId)
      .eq("status", "issued")
      .eq("commission_status", "pending"),
  ]);

  const error = bookingError ?? voucherError;
  if (error) {
    redirect(`/admin/commissions?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/commissions?updated=1");
}
