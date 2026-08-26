"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendBookingConfirmedEmail } from "@/lib/email/resend";

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
