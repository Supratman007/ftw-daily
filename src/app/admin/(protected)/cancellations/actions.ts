"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { generateVoucherCode } from "@/lib/cancellations/voucherCode";
import {
  sendCancellationApprovedRefundEmail,
  sendCancellationApprovedRescheduleEmail,
  sendCancellationApprovedGiftVoucherEmail,
  sendCancellationRejectedEmail,
} from "@/lib/email/resend";

type PendingRequest = {
  id: string;
  booking_id: string;
  path: "standard" | "force_majeure";
  status: "pending_review" | "approved" | "rejected";
  calculated_refund_amount_idr: number | null;
  bookings: {
    id: string;
    booking_code: string;
    slot_date: string;
    pax_count: number;
    total_idr: number;
    product_id: string;
    customer_id: string;
    products: { title: string } | null;
    customers: { name: string; email: string; phone: string | null } | null;
  } | null;
};

async function loadPendingRequest(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, requestId: string) {
  const { data } = await supabase
    .from("cancellation_requests")
    .select(
      "id, booking_id, path, status, calculated_refund_amount_idr, bookings(id, booking_code, slot_date, pax_count, total_idr, product_id, customer_id, products(title), customers(name, email, phone))"
    )
    .eq("id", requestId)
    .maybeSingle();
  return data as unknown as PendingRequest | null;
}

function bookingUrlFor(bookingId: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/account/booking/${bookingId}`;
}

function redeemUrlFor(voucherCode: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/redeem?code=${encodeURIComponent(voucherCode)}`;
}

/** Standard path only -- refunds the already-calculated amount
 * (spec §6f: computed at request time, confirmed here by a human
 * before anything is actually refunded). No Xendit refund API call --
 * same "money moving out is manual, tracked in-app" pattern as
 * commission payouts; approving here means you'll process the refund
 * via Xendit's own dashboard or bank transfer, same as always. */
export async function approveRefundAction(requestId: string, formData: FormData) {
  const admin = await requireAdmin();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  function fail(message: string): never {
    redirect(`/admin/cancellations/${requestId}?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createSupabaseServerClient();
  const request = await loadPendingRequest(supabase, requestId);
  if (!request || !request.bookings) fail("Request not found.");
  if (request.status !== "pending_review") fail("This request has already been actioned.");
  if (request.path !== "standard") fail("Use the reschedule/voucher actions for force majeure requests.");

  const booking = request.bookings;

  await supabase
    .from("cancellation_requests")
    .update({
      status: "approved",
      resolution: "refund",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes || null,
    })
    .eq("id", requestId);

  await supabase
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", booking.id);

  const serviceClient = createSupabaseServiceRoleClient();
  await serviceClient.rpc("release_booking_capacity", {
    p_product_id: booking.product_id,
    p_slot_date: booking.slot_date,
    p_pax: booking.pax_count,
  });

  if (booking.customers) {
    await sendCancellationApprovedRefundEmail({
      toEmail: booking.customers.email,
      customerName: booking.customers.name,
      productTitle: booking.products?.title ?? "your trip",
      bookingCode: booking.booking_code,
      refundAmountIdr: request.calculated_refund_amount_idr ?? 0,
      bookingUrl: bookingUrlFor(booking.id),
    });
  }

  redirect(`/admin/cancellations/${requestId}?approved=1`);
}

/** Reschedules at no fee. Originally force-majeure-only, but real
 * customer behavior showed standard-path requests often just want a
 * new date too (spec §6f's intent -- "make it easy, simple and
 * everyone happy" -- doesn't require punishing an ordinary reschedule
 * ask by forcing a refund/cancel instead), so any pending request can
 * be resolved this way now. Reserves the new date *before* releasing
 * the old one, so a fully-booked target date fails cleanly with
 * nothing changed yet, rather than leaving the booking briefly
 * holding no reservation at all if the reserve step failed after the
 * release. */
export async function approveRescheduleAction(requestId: string, formData: FormData) {
  const admin = await requireAdmin();
  const newSlotDate = String(formData.get("new_slot_date") ?? "").trim();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  function fail(message: string): never {
    redirect(`/admin/cancellations/${requestId}?error=${encodeURIComponent(message)}`);
  }

  if (!newSlotDate || Number.isNaN(Date.parse(newSlotDate))) {
    fail("Please choose a valid new date.");
  }

  const supabase = await createSupabaseServerClient();
  const request = await loadPendingRequest(supabase, requestId);
  if (!request || !request.bookings) fail("Request not found.");
  if (request.status !== "pending_review") fail("This request has already been actioned.");

  const booking = request.bookings;
  const serviceClient = createSupabaseServiceRoleClient();

  // capacity_per_date isn't selected on the request/booking join above
  // (a product-level lookup) -- fetch it now, same as
  // startCheckoutAction does, rather than assuming unlimited.
  const { data: product } = await supabase
    .from("products")
    .select("capacity_per_date")
    .eq("id", booking.product_id)
    .maybeSingle();

  const { data: reserved, error: reserveError } = await serviceClient.rpc(
    "reserve_booking_capacity",
    {
      p_product_id: booking.product_id,
      p_slot_date: newSlotDate,
      p_pax: booking.pax_count,
      p_default_capacity: product?.capacity_per_date ?? null,
    }
  );

  if (reserveError) {
    fail(`Couldn't check availability for that date: ${reserveError.message}`);
  }
  if (!reserved) {
    fail("That date is fully booked -- please choose a different date.");
  }

  await serviceClient.rpc("release_booking_capacity", {
    p_product_id: booking.product_id,
    p_slot_date: booking.slot_date,
    p_pax: booking.pax_count,
  });

  await supabase
    .from("cancellation_requests")
    .update({
      status: "approved",
      resolution: "reschedule",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes || null,
    })
    .eq("id", requestId);

  await supabase
    .from("bookings")
    .update({ slot_date: newSlotDate, updated_at: new Date().toISOString() })
    .eq("id", booking.id);

  if (booking.customers) {
    await sendCancellationApprovedRescheduleEmail({
      toEmail: booking.customers.email,
      customerName: booking.customers.name,
      productTitle: booking.products?.title ?? "your trip",
      bookingCode: booking.booking_code,
      newSlotDate,
      bookingUrl: bookingUrlFor(booking.id),
    });
  }

  redirect(`/admin/cancellations/${requestId}?approved=1`);
}

/** Converts the booking's value into a transferable voucher, per spec
 * §6f, "redeemable for the same product at the same value, under the
 * same terms as the original booking." Originally force-majeure-only;
 * now available for any pending request, since a standard-path
 * customer can just as reasonably want to gift their trip to someone
 * else rather than take a partial refund. The voucher value defaults
 * sensibly per path (full booking value for force majeure, the
 * calculated refund amount for standard) but stays admin-adjustable --
 * some situations call for a different number than either default.
 * Redemption itself is handled manually (the customer or recipient
 * contacts you with the code) -- no self-serve checkout redemption
 * flow in this pass. */
export async function approveGiftVoucherAction(requestId: string, formData: FormData) {
  const admin = await requireAdmin();
  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const recipientContact = String(formData.get("recipient_contact") ?? "").trim();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();
  const valueAmountRaw = String(formData.get("value_amount_idr") ?? "").trim();
  const expiresAtRaw = String(formData.get("expires_at") ?? "").trim();

  function fail(message: string): never {
    redirect(`/admin/cancellations/${requestId}?error=${encodeURIComponent(message)}`);
  }

  if (!recipientName || !recipientContact) {
    fail("Please enter who the voucher is for and how to reach them.");
  }

  const supabase = await createSupabaseServerClient();
  const request = await loadPendingRequest(supabase, requestId);
  if (!request || !request.bookings) fail("Request not found.");
  if (request.status !== "pending_review") fail("This request has already been actioned.");

  const booking = request.bookings;

  const valueAmountIdr = valueAmountRaw ? Number(valueAmountRaw) : NaN;
  if (!Number.isFinite(valueAmountIdr) || valueAmountIdr <= 0) {
    fail("Please enter a valid voucher value.");
  }

  // Policy: a voucher's validity window is set right here at approval,
  // constrained to 3-6 months out -- long enough to be usable, short
  // enough that it isn't an open-ended liability. Enforced server-side
  // (not just the form's min/max) since a form attribute alone can be
  // bypassed.
  if (!expiresAtRaw || Number.isNaN(Date.parse(expiresAtRaw))) {
    fail("Please choose a valid expiry date.");
  }
  const minExpiry = new Date();
  minExpiry.setMonth(minExpiry.getMonth() + 3);
  const maxExpiry = new Date();
  maxExpiry.setMonth(maxExpiry.getMonth() + 6);
  const minExpiryStr = minExpiry.toISOString().slice(0, 10);
  const maxExpiryStr = maxExpiry.toISOString().slice(0, 10);
  if (expiresAtRaw < minExpiryStr || expiresAtRaw > maxExpiryStr) {
    fail(`Expiry must be between ${minExpiryStr} and ${maxExpiryStr} (3-6 months from today).`);
  }

  const { error: voucherError } = await supabase.from("gift_vouchers").insert({
    original_booking_id: booking.id,
    product_id: booking.product_id,
    value_amount_idr: valueAmountIdr,
    recipient_name: recipientName,
    recipient_contact: recipientContact,
    redemption_code: generateVoucherCode(),
    expires_at: new Date(`${expiresAtRaw}T23:59:59Z`).toISOString(),
  });

  if (voucherError) {
    fail(`Couldn't create the voucher: ${voucherError.message}`);
  }

  await supabase
    .from("cancellation_requests")
    .update({
      status: "approved",
      resolution: "gift_voucher",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes || null,
    })
    .eq("id", requestId);

  await supabase
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", booking.id);

  const serviceClient = createSupabaseServiceRoleClient();
  await serviceClient.rpc("release_booking_capacity", {
    p_product_id: booking.product_id,
    p_slot_date: booking.slot_date,
    p_pax: booking.pax_count,
  });

  const { data: voucher } = await supabase
    .from("gift_vouchers")
    .select("redemption_code, expires_at")
    .eq("original_booking_id", booking.id)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (booking.customers && voucher) {
    await sendCancellationApprovedGiftVoucherEmail({
      toEmail: booking.customers.email,
      customerName: booking.customers.name,
      productTitle: booking.products?.title ?? "your trip",
      bookingCode: booking.booking_code,
      voucherCode: voucher.redemption_code,
      valueIdr: valueAmountIdr,
      recipientName,
      expiresAt: voucher.expires_at,
      bookingUrl: bookingUrlFor(booking.id),
      redeemUrl: redeemUrlFor(voucher.redemption_code),
    });
  }

  redirect(`/admin/cancellations/${requestId}?approved=1`);
}

export async function rejectCancellationRequestAction(requestId: string, formData: FormData) {
  const admin = await requireAdmin();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  function fail(message: string): never {
    redirect(`/admin/cancellations/${requestId}?error=${encodeURIComponent(message)}`);
  }

  if (!adminNotes) {
    fail("Please explain why, so the customer knows what to expect.");
  }

  const supabase = await createSupabaseServerClient();
  const request = await loadPendingRequest(supabase, requestId);
  if (!request || !request.bookings) fail("Request not found.");
  if (request.status !== "pending_review") fail("This request has already been actioned.");

  await supabase
    .from("cancellation_requests")
    .update({
      status: "rejected",
      resolution: "rejected",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes,
    })
    .eq("id", requestId);

  if (request.bookings.customers) {
    await sendCancellationRejectedEmail({
      toEmail: request.bookings.customers.email,
      customerName: request.bookings.customers.name,
      productTitle: request.bookings.products?.title ?? "your trip",
      bookingCode: request.bookings.booking_code,
      adminNotes,
      bookingUrl: bookingUrlFor(request.bookings.id),
    });
  }

  redirect(`/admin/cancellations/${requestId}?rejected=1`);
}
