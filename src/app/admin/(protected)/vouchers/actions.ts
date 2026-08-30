"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { generateBookingCode } from "@/lib/bookings/booking-code";
import {
  sendVoucherRedeemedBookingConfirmedEmail,
  sendVoucherRedeemedNeedsAccountEmail,
} from "@/lib/email/resend";

/**
 * The real "close the loop" step: creates an actual booking for the
 * recipient (paid_confirmed -- the voucher already covers it, no
 * second payment) and links it back to the voucher, so
 * /account/booking/[id] -- with the same chat panel every other
 * customer has -- becomes their trip's home in the app. A booking's
 * customer_id is a real account (schema requires it, not just this
 * app's convention), so this only works once someone has registered
 * with the email they gave us at /redeem; until then this sends a
 * "please create an account" nudge instead and leaves the voucher as
 * issued so it can be tried again.
 */
export async function confirmVoucherRedemptionAction(voucherId: string, formData: FormData) {
  await requireAdmin();
  const returnTo = String(formData.get("return_to") ?? "/admin/vouchers");
  const slotDateOverride = String(formData.get("slot_date") ?? "").trim();

  function withParam(key: string, value: string): string {
    return `${returnTo}${returnTo.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
  }
  function fail(message: string): never {
    redirect(withParam("error", message));
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: voucher } = await serviceClient
    .from("gift_vouchers")
    .select(
      "id, status, product_id, value_amount_idr, original_booking_id, redeemed_by_name, redeemed_by_email, requested_slot_date, products(title, adult_price_usd, capacity_per_date)"
    )
    .eq("id", voucherId)
    .maybeSingle();

  if (!voucher) fail("Voucher not found.");
  if (voucher.status !== "issued") fail("This voucher isn't in a redeemable state.");
  if (!voucher.redeemed_by_email) {
    fail("No redemption request on file yet -- ask the recipient to submit one at /redeem first.");
  }

  const slotDate = slotDateOverride || voucher.requested_slot_date;
  if (!slotDate) fail("No date on file -- enter one before confirming.");

  const product = (voucher as unknown as {
    products: { title: string; adult_price_usd: number | null; capacity_per_date: number | null } | null;
  }).products;
  const productTitle = product?.title ?? "your trip";

  const [{ data: originalBooking }, { data: customer }] = await Promise.all([
    serviceClient
      .from("bookings")
      .select("pax_count")
      .eq("id", voucher.original_booking_id)
      .maybeSingle(),
    serviceClient.from("customers").select("id").eq("email", voucher.redeemed_by_email).maybeSingle(),
  ]);
  const paxCount = originalBooking?.pax_count ?? 1;

  if (!customer) {
    // Nothing to create a booking under yet -- nudge them to register
    // with this same email, and leave the voucher exactly as it was so
    // this can just be tried again once they have.
    await sendVoucherRedeemedNeedsAccountEmail({
      toEmail: voucher.redeemed_by_email,
      recipientName: voucher.redeemed_by_name ?? "there",
      productTitle,
    });
    redirect(
      withParam(
        "notice",
        `No account found for ${voucher.redeemed_by_email} yet -- sent them a reminder to sign up. Try again once they have.`
      )
    );
  }

  const { data: reserved, error: reserveError } = await serviceClient.rpc("reserve_booking_capacity", {
    p_product_id: voucher.product_id,
    p_slot_date: slotDate,
    p_pax: paxCount,
    p_default_capacity: product?.capacity_per_date ?? null,
  });
  if (reserveError) fail(`Couldn't check availability for that date: ${reserveError.message}`);
  if (!reserved) fail("That date is fully booked -- choose a different date and try again.");

  const subtotalUsd = (product?.adult_price_usd ?? 0) * paxCount;

  const { data: booking, error: insertError } = await serviceClient
    .from("bookings")
    .insert({
      booking_code: generateBookingCode(),
      customer_id: customer.id,
      product_id: voucher.product_id,
      slot_date: slotDate,
      pax_count: paxCount,
      subtotal_usd: subtotalUsd,
      total_usd: subtotalUsd,
      total_idr: voucher.value_amount_idr,
      status: "paid_confirmed",
    })
    .select("id")
    .single();

  if (insertError || !booking) {
    await serviceClient.rpc("release_booking_capacity", {
      p_product_id: voucher.product_id,
      p_slot_date: slotDate,
      p_pax: paxCount,
    });
    fail(`Couldn't create the booking: ${insertError?.message ?? "please try again."}`);
  }

  await serviceClient
    .from("gift_vouchers")
    .update({ status: "redeemed", redeemed_booking_id: booking.id })
    .eq("id", voucher.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await sendVoucherRedeemedBookingConfirmedEmail({
    toEmail: voucher.redeemed_by_email,
    recipientName: voucher.redeemed_by_name ?? "there",
    productTitle,
    slotDate,
    bookingUrl: `${siteUrl}/account/booking/${booking.id}`,
  });

  redirect(returnTo);
}

export async function markVoucherExpiredAction(voucherId: string, formData: FormData) {
  await requireAdmin();
  const returnTo = String(formData.get("return_to") ?? "/admin/vouchers");

  const supabase = await createSupabaseServerClient();
  await supabase.from("gift_vouchers").update({ status: "expired" }).eq("id", voucherId);

  redirect(returnTo);
}
