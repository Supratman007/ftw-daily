"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { sendBookingConfirmedEmail, sendPickupTimeChangedStaffEmail } from "@/lib/email/resend";
import { PICKUP_CHANGE_CUTOFF_HOURS } from "@/lib/bookings/types";

/** Spec §6h booking detail actions, "Upcoming: view confirmation email"
 * -- rather than a separate page that just re-renders the same email
 * content, this resends the actual email, which covers the same need
 * ("I want that email again") more directly. */
export async function resendConfirmationEmailAction(bookingId: string) {
  const customer = await requireCustomer(`/account/booking/${bookingId}`);
  const supabase = await createSupabaseServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, products(title)")
    .eq("id", bookingId)
    .eq("customer_id", customer.id)
    .eq("status", "paid_confirmed")
    .maybeSingle();

  if (booking) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendBookingConfirmedEmail({
      toEmail: customer.email,
      customerName: customer.name,
      productTitle: booking.products?.title ?? "Your trip",
      slotDate: booking.slot_date,
      paxCount: booking.pax_count,
      totalIdr: booking.total_idr,
      bookingCode: booking.booking_code,
      bookingUrl: `${siteUrl}/confirmation/${booking.id}`,
      discountCode: booking.discount_code,
      discountAmountUsd: booking.discount_amount_usd,
    });
  }

  redirect(`/account/booking/${bookingId}?resent=1`);
}

function formatPickup(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Self-service pickup-time change (spec §6e), Car Hire/Transport only.
 * Uses the service-role client for the actual write -- like every other
 * customer-triggered booking mutation in this app (see the RLS notes on
 * requestGiftVoucherRefundAction), bookings has no customer UPDATE
 * policy at all, by design, so this can't go through the session
 * client. Ownership is still verified first, via the session client's
 * own RLS-scoped read.
 */
export async function changePickupTimeAction(bookingId: string, formData: FormData) {
  const customer = await requireCustomer(`/account/booking/${bookingId}`);
  const supabase = await createSupabaseServerClient();

  function fail(message: string): never {
    redirect(`/account/booking/${bookingId}?error=${encodeURIComponent(message)}`);
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, pickup_datetime, booking_code, product_id")
    .eq("id", bookingId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!booking || !booking.pickup_datetime) {
    fail("This booking doesn't have a pickup time to change.");
  }
  if (booking.status !== "paid_confirmed") {
    fail("Only confirmed bookings can have their pickup time changed.");
  }

  const oldPickupDatetime = booking.pickup_datetime;
  const hoursUntilPickup = (new Date(oldPickupDatetime).getTime() - Date.now()) / 3_600_000;
  if (hoursUntilPickup < PICKUP_CHANGE_CUTOFF_HOURS) {
    fail(
      `Pickup is less than ${PICKUP_CHANGE_CUTOFF_HOURS} hours away, so this can't be changed online anymore -- please contact us directly and we'll do our best to help.`
    );
  }

  const newDate = String(formData.get("pickup_date") ?? "");
  const newTime = String(formData.get("pickup_time") ?? "");
  const newPickupDatetime = new Date(`${newDate}T${newTime}:00`);
  if (!newDate || !newTime || Number.isNaN(newPickupDatetime.getTime())) {
    fail("Please choose a valid pickup date and time.");
  }
  if (newPickupDatetime.getTime() < Date.now()) {
    fail("Pickup time must be in the future.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { error: updateError } = await serviceClient
    .from("bookings")
    .update({ pickup_datetime: newPickupDatetime.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (updateError) {
    fail(`Couldn't update your pickup time: ${updateError.message}`);
  }

  await serviceClient.from("booking_pickup_changes").insert({
    booking_id: bookingId,
    old_datetime: oldPickupDatetime,
    new_datetime: newPickupDatetime.toISOString(),
  });

  const { data: staff } = await serviceClient
    .from("admin_users")
    .select("email")
    .eq("status", "active");

  const { data: product } = await serviceClient
    .from("products")
    .select("title")
    .eq("id", booking.product_id)
    .maybeSingle();
  const productTitle = product?.title ?? "Trip";
  await Promise.all(
    (staff ?? []).map((admin) =>
      sendPickupTimeChangedStaffEmail({
        toEmail: admin.email,
        productTitle,
        bookingCode: booking.booking_code,
        customerName: customer.name,
        oldPickupNote: formatPickup(oldPickupDatetime),
        newPickupNote: formatPickup(newPickupDatetime.toISOString()),
      })
    )
  );

  redirect(`/account/booking/${bookingId}?notice=${encodeURIComponent("Pickup time updated.")}`);
}
