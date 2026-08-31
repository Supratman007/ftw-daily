"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { generateBookingCode } from "@/lib/bookings/booking-code";
import {
  sendVoucherRedeemedBookingConfirmedEmail,
  sendVoucherRedeemedNeedsAccountEmail,
  sendGiftVoucherRedeemedNotifyGiverEmail,
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
  const paxCountOverrideRaw = String(formData.get("pax_count") ?? "").trim();

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
      "id, status, expires_at, product_id, value_amount_idr, original_booking_id, purchaser_customer_id, redeemed_by_name, redeemed_by_email, requested_slot_date, requested_pax_count, redemption_code, products(title, adult_price_usd, capacity_per_date)"
    )
    .eq("id", voucherId)
    .maybeSingle();

  if (!voucher) fail("Voucher not found.");
  if (voucher.status !== "issued") fail("This voucher isn't in a redeemable state.");
  if (new Date(voucher.expires_at) < new Date()) {
    fail("This voucher has expired -- it can no longer be redeemed.");
  }
  if (!voucher.redeemed_by_email) {
    fail("No redemption request on file yet -- ask the recipient to submit one at /redeem first.");
  }

  const slotDate = slotDateOverride || voucher.requested_slot_date;
  if (!slotDate) fail("No date on file -- enter one before confirming.");

  const product = (voucher as unknown as {
    products: { title: string; adult_price_usd: number | null; capacity_per_date: number | null } | null;
  }).products;
  const productTitle = product?.title ?? "your trip";

  // A voucher's giver is reached one of two ways depending on where it
  // came from: through the original booking it was cancelled from, or
  // (for one bought directly at /p/[slug]/gift) the purchaser_customer_id
  // recorded on the voucher itself.
  const [{ data: originalBooking }, { data: purchaser }, { data: customer }] = await Promise.all([
    voucher.original_booking_id
      ? serviceClient
          .from("bookings")
          .select("pax_count, customers(name, email)")
          .eq("id", voucher.original_booking_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    voucher.purchaser_customer_id
      ? serviceClient
          .from("customers")
          .select("name, email")
          .eq("id", voucher.purchaser_customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    serviceClient.from("customers").select("id").eq("email", voucher.redeemed_by_email).maybeSingle(),
  ]);

  const paxCountOverride = Number(paxCountOverrideRaw);
  const paxCount =
    Number.isInteger(paxCountOverride) && paxCountOverride > 0
      ? paxCountOverride
      : voucher.requested_pax_count ?? originalBooking?.pax_count ?? 1;

  if (!customer) {
    // Nothing to create a booking under yet -- nudge them to register
    // with this same email, and leave the voucher exactly as it was so
    // this can just be tried again once they have.
    await sendVoucherRedeemedNeedsAccountEmail({
      toEmail: voucher.redeemed_by_email,
      recipientName: voucher.redeemed_by_name ?? "there",
      productTitle,
      voucherCode: voucher.redemption_code,
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
  const originalGiver =
    (originalBooking as unknown as { customers: { name: string; email: string } | null } | null)
      ?.customers ?? purchaser;

  await Promise.all([
    sendVoucherRedeemedBookingConfirmedEmail({
      toEmail: voucher.redeemed_by_email,
      recipientName: voucher.redeemed_by_name ?? "there",
      productTitle,
      slotDate,
      bookingUrl: `${siteUrl}/account/booking/${booking.id}`,
    }),
    // Whoever originally gave the gift never otherwise finds out it was
    // used -- only the recipient gets confirmation emails throughout
    // this whole flow. Best-effort: if the original booking or its
    // customer record is gone, redemption still succeeds without this.
    ...(originalGiver
      ? [
          sendGiftVoucherRedeemedNotifyGiverEmail({
            toEmail: originalGiver.email,
            giverName: originalGiver.name,
            recipientName: voucher.redeemed_by_name ?? "Your recipient",
            productTitle,
            slotDate,
          }),
        ]
      : []),
  ]);

  redirect(returnTo);
}

export async function markVoucherExpiredAction(voucherId: string, formData: FormData) {
  await requireAdmin();
  const returnTo = String(formData.get("return_to") ?? "/admin/vouchers");

  const supabase = await createSupabaseServerClient();
  await supabase.from("gift_vouchers").update({ status: "expired" }).eq("id", voucherId);

  redirect(returnTo);
}
