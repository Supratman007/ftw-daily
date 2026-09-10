import "server-only";
import type { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

/**
 * Spec §13: "attribution logic needs test coverage and an audit log
 * (which booking, which agent, which cookie, timestamped) so disputes
 * are resolvable." Called once, right after a booking or gift voucher
 * that carries a referred_by_agent_id is actually created -- the only
 * write to referral_attributions anywhere in this app, and the table
 * has no RLS policies for anything else to write through. Silently
 * does nothing when there's no agent to attribute to (unset
 * referredByAgentId, or the booking/voucher row failed to insert) --
 * this is a record of what happened, never a gate on checkout
 * succeeding.
 */
export async function recordReferralAttribution(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  params: {
    agentId: string | null;
    referralCode: string;
    bookingId?: string;
    giftVoucherId?: string;
  }
): Promise<void> {
  if (!params.agentId) return;

  const { error } = await serviceClient.from("referral_attributions").insert({
    agent_id: params.agentId,
    referral_code: params.referralCode.toUpperCase(),
    booking_id: params.bookingId ?? null,
    gift_voucher_id: params.giftVoucherId ?? null,
  });

  // Never lets an audit-log write failure surface to the customer or
  // block checkout -- the booking/voucher itself already succeeded by
  // the time this runs. Logged server-side so it isn't silently lost.
  if (error) {
    console.error("Couldn't record referral attribution:", error);
  }
}
