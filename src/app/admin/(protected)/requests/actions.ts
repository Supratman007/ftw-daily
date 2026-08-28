"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { createXenditInvoice } from "@/lib/xendit/client";
import {
  sendBookingRequestConfirmedEmail,
  sendBookingRequestDeclinedEmail,
} from "@/lib/email/resend";

const CONFIRMATION_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * "Available -> Confirm" from spec §6b's flow diagram: creates the
 * Xendit invoice right now, with its expiry set to exactly the 24h
 * window the spec calls for, so the existing payment webhook is the
 * only thing that ever needs to act on that deadline -- no separate
 * cron job polling confirmation_deadline.
 */
export async function confirmRequestAction(bookingId: string) {
  await requireAdmin();

  function fail(message: string): never {
    redirect(`/admin/requests/${bookingId}?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_code, slot_date, total_idr, customer_id, product_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    fail("Booking not found.");
  }
  if (booking.status !== "under_review") {
    fail("This request has already been actioned.");
  }

  const [{ data: customer }, { data: product }] = await Promise.all([
    supabase.from("customers").select("name, email").eq("id", booking.customer_id).maybeSingle(),
    supabase.from("products").select("title").eq("id", booking.product_id).maybeSingle(),
  ]);

  if (!customer || !product) {
    fail("Couldn't load the customer or trip for this booking.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let invoice;
  try {
    invoice = await createXenditInvoice({
      externalId: booking.booking_code,
      amountIdr: booking.total_idr,
      payerEmail: customer.email,
      description: product.title,
      successRedirectUrl: `${siteUrl}/confirmation/${booking.id}`,
      failureRedirectUrl: `${siteUrl}/account/booking/${booking.id}`,
      invoiceDurationSeconds: CONFIRMATION_WINDOW_SECONDS,
    });
  } catch (err) {
    fail(`Couldn't create the payment link: ${(err as Error).message}`);
  }

  const confirmationDeadline = new Date(
    Date.now() + CONFIRMATION_WINDOW_SECONDS * 1000
  ).toISOString();

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "confirmed_awaiting_payment",
      xendit_invoice_id: invoice.id,
      xendit_invoice_url: invoice.invoice_url,
      confirmation_deadline: confirmationDeadline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    fail(updateError.message);
  }

  await sendBookingRequestConfirmedEmail({
    toEmail: customer.email,
    customerName: customer.name,
    productTitle: product.title,
    slotDate: booking.slot_date,
    bookingCode: booking.booking_code,
    totalIdr: booking.total_idr,
    paymentUrl: invoice.invoice_url,
  });

  redirect(`/admin/requests/${bookingId}?confirmed=1`);
}

/** "Unavailable -> Decline" -- no Xendit invoice exists yet at this
 * point, so nothing to cancel there; just releases the in-app capacity
 * hold and tells the customer why, per spec §6b's decline_reason
 * being customer-visible. */
export async function declineRequestAction(bookingId: string, formData: FormData) {
  await requireAdmin();
  const reason = String(formData.get("decline_reason") ?? "").trim();

  function fail(message: string): never {
    redirect(`/admin/requests/${bookingId}?error=${encodeURIComponent(message)}`);
  }

  if (!reason) {
    fail("Please explain why, so the customer knows what to expect.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_code, slot_date, pax_count, product_id, customer_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    fail("Booking not found.");
  }
  if (booking.status !== "under_review") {
    fail("This request has already been actioned.");
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "declined", decline_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (updateError) {
    fail(updateError.message);
  }

  const serviceClient = createSupabaseServiceRoleClient();
  await serviceClient.rpc("release_booking_capacity", {
    p_product_id: booking.product_id,
    p_slot_date: booking.slot_date,
    p_pax: booking.pax_count,
  });

  const [{ data: customer }, { data: product }] = await Promise.all([
    supabase.from("customers").select("name, email").eq("id", booking.customer_id).maybeSingle(),
    supabase.from("products").select("title, slug").eq("id", booking.product_id).maybeSingle(),
  ]);

  if (customer && product) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendBookingRequestDeclinedEmail({
      toEmail: customer.email,
      customerName: customer.name,
      productTitle: product.title,
      slotDate: booking.slot_date,
      bookingCode: booking.booking_code,
      declineReason: reason,
      productUrl: `${siteUrl}/p/${product.slug}`,
    });
  }

  redirect(`/admin/requests/${bookingId}?declined=1`);
}

export async function saveAdminNotesAction(bookingId: string, formData: FormData) {
  await requireAdmin();
  const notes = String(formData.get("admin_notes") ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bookings")
    .update({ admin_notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) {
    redirect(`/admin/requests/${bookingId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/requests/${bookingId}?notes_saved=1`);
}
