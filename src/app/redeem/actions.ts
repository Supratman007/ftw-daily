"use server";

import { redirect } from "next/navigation";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import {
  sendVoucherRedemptionReceivedEmail,
  sendVoucherRedemptionRequestStaffEmail,
} from "@/lib/email/resend";

/**
 * No authenticated user here at all -- the recipient was never a
 * customer -- so every read and write goes through the service-role
 * client, same as the rest of the redemption flow (see the RedeemPage
 * comment). Loads and re-validates the voucher itself rather than
 * trusting anything from the form beyond the code in the URL.
 */
export async function submitRedemptionRequestAction(voucherCode: string, formData: FormData) {
  function fail(message: string): never {
    redirect(`/redeem?code=${encodeURIComponent(voucherCode)}&error=${encodeURIComponent(message)}`);
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const preferredSlotDate = String(formData.get("preferred_slot_date") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name) fail("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Please enter a valid email.");
  if (!preferredSlotDate || Number.isNaN(Date.parse(preferredSlotDate))) {
    fail("Please choose a preferred date.");
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  if (preferredSlotDate <= todayStr) {
    fail("Please choose a future date.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: voucher } = await serviceClient
    .from("gift_vouchers")
    .select("id, status, expires_at, products(title)")
    .eq("redemption_code", voucherCode)
    .maybeSingle();

  if (!voucher) fail("Voucher not found.");
  if (voucher.status === "redeemed") fail("This voucher has already been redeemed.");
  if (voucher.status === "expired" || new Date(voucher.expires_at) < new Date()) {
    fail("This voucher has expired.");
  }

  const { error: updateError } = await serviceClient
    .from("gift_vouchers")
    .update({
      redeemed_by_name: name,
      redeemed_by_email: email,
      redeemed_by_phone: phone || null,
      requested_slot_date: preferredSlotDate,
      redemption_message: message || null,
      redemption_requested_at: new Date().toISOString(),
    })
    .eq("id", voucher.id);

  if (updateError) {
    fail(`Couldn't submit your request: ${updateError.message}`);
  }

  const productTitle = (voucher as unknown as { products: { title: string } | null }).products?.title ?? "your trip";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: staff } = await serviceClient
    .from("admin_users")
    .select("email")
    .eq("status", "active");

  await Promise.all([
    sendVoucherRedemptionReceivedEmail({
      toEmail: email,
      recipientName: name,
      productTitle,
      voucherCode,
    }),
    ...(staff ?? []).map((admin) =>
      sendVoucherRedemptionRequestStaffEmail({
        toEmail: admin.email,
        recipientName: name,
        recipientEmail: email,
        recipientPhone: phone || null,
        productTitle,
        voucherCode,
        requestedSlotDate: preferredSlotDate,
        message: message || null,
        reviewUrl: `${siteUrl}/admin/vouchers`,
      })
    ),
  ]);

  redirect(`/redeem?code=${encodeURIComponent(voucherCode)}&submitted=1`);
}
