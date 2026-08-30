"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Marks a voucher redeemed once staff have actually created the new
 * booking for the recipient (a manual step, same "money/booking
 * creation is a human decision" pattern as everywhere else in the
 * cancellation flow) -- this just closes the loop in the voucher's own
 * record so it stops showing as outstanding. */
export async function markVoucherRedeemedAction(voucherId: string, formData: FormData) {
  await requireAdmin();
  const returnTo = String(formData.get("return_to") ?? "/admin/vouchers");

  const supabase = await createSupabaseServerClient();
  await supabase.from("gift_vouchers").update({ status: "redeemed" }).eq("id", voucherId);

  redirect(returnTo);
}

export async function markVoucherExpiredAction(voucherId: string, formData: FormData) {
  await requireAdmin();
  const returnTo = String(formData.get("return_to") ?? "/admin/vouchers");

  const supabase = await createSupabaseServerClient();
  await supabase.from("gift_vouchers").update({ status: "expired" }).eq("id", voucherId);

  redirect(returnTo);
}
