"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { daysBeforeDeparture, resolveCancellationRefundPercent } from "@/lib/cancellations/policy";
import { sendCancellationRequestReceivedEmail, sendNewCancellationStaffEmail } from "@/lib/email/resend";
import {
  CANCELLATION_PREFERRED_RESOLUTION_LABELS,
  type CancellationPath,
  type CancellationPreferredResolution,
} from "@/lib/cancellations/types";

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024; // 5MB
const EVIDENCE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

export async function submitCancellationRequestAction(bookingId: string, formData: FormData) {
  const customer = await requireCustomer(`/account/booking/${bookingId}/cancel`);

  function fail(message: string): never {
    redirect(`/account/booking/${bookingId}/cancel?error=${encodeURIComponent(message)}`);
  }

  const pathRaw = String(formData.get("path") ?? "");
  if (pathRaw !== "standard" && pathRaw !== "force_majeure") {
    fail("Please choose a request type.");
  }
  const path = pathRaw as CancellationPath;

  const preferredResolutionRaw = String(formData.get("preferred_resolution") ?? "");
  if (!["refund", "reschedule", "gift_voucher"].includes(preferredResolutionRaw)) {
    fail("Please choose what you'd like us to do.");
  }
  const preferredResolution = preferredResolutionRaw as CancellationPreferredResolution;
  if (path === "force_majeure" && preferredResolution === "refund") {
    fail(
      "Force majeure requests don't offer a plain refund -- please choose reschedule or a gift voucher instead."
    );
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    fail("Please tell us what happened.");
  }

  const evidenceFile = formData.get("evidence");
  if (path === "force_majeure") {
    if (!(evidenceFile instanceof File) || evidenceFile.size === 0) {
      fail("Please upload supporting documentation for a force majeure request.");
    }
    if (!(evidenceFile.type in EVIDENCE_EXT_BY_MIME)) {
      fail("Supporting documentation must be a JPG, PNG, or PDF.");
    }
    if (evidenceFile.size > MAX_EVIDENCE_BYTES) {
      fail("Supporting documentation must be smaller than 5MB.");
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_code, slot_date, total_idr, status, products(title)")
    .eq("id", bookingId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!booking) {
    fail("Booking not found.");
  }
  if (booking.status !== "paid_confirmed") {
    fail("Only confirmed, paid bookings can be cancelled or rescheduled.");
  }

  const { count: pendingCount } = await supabase
    .from("cancellation_requests")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("status", "pending_review");
  if ((pendingCount ?? 0) > 0) {
    fail("You already have a request pending review for this booking.");
  }

  let calculatedRefundPercent: number | null = null;
  let calculatedRefundAmountIdr: number | null = null;
  if (path === "standard") {
    const { data: tiers } = await supabase
      .from("cancellation_policy_tiers")
      .select("id, min_days_before_departure, refund_percent");
    const today = new Date().toISOString().slice(0, 10);
    const daysOut = daysBeforeDeparture(booking.slot_date, today);
    calculatedRefundPercent = resolveCancellationRefundPercent(tiers ?? [], daysOut);
    calculatedRefundAmountIdr = Math.round(booking.total_idr * (calculatedRefundPercent / 100));
  }

  const { data: inserted, error: insertError } = await supabase
    .from("cancellation_requests")
    .insert({
      booking_id: bookingId,
      path,
      reason,
      preferred_resolution: preferredResolution,
      calculated_refund_percent: calculatedRefundPercent,
      calculated_refund_amount_idr: calculatedRefundAmountIdr,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    fail(`Couldn't submit your request: ${insertError?.message ?? "please try again."}`);
  }

  // Evidence upload goes through the service-role client -- same
  // "private bucket, zero RLS policies, server code only" pattern as
  // agent documents and Rinjani passports.
  if (path === "force_majeure" && evidenceFile instanceof File) {
    const serviceClient = createSupabaseServiceRoleClient();
    const evidencePath = `${inserted.id}.${EVIDENCE_EXT_BY_MIME[evidenceFile.type]}`;
    const { error: uploadError } = await serviceClient.storage
      .from("cancellation-evidence")
      .upload(evidencePath, evidenceFile, { contentType: evidenceFile.type });

    if (!uploadError) {
      // Service-role client, not the customer's session -- there's no
      // customer UPDATE policy on cancellation_requests (0019), same
      // reasoning as the fix for the Rinjani passport-linking bug: an
      // update via a client with no matching RLS policy fails silently
      // (zero rows matched, no error raised) rather than loudly.
      await serviceClient
        .from("cancellation_requests")
        .update({ evidence_path: evidencePath })
        .eq("id", inserted.id);
    }
  }

  const productTitle =
    (booking as unknown as { products: { title: string } | null }).products?.title ?? "your trip";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const bookingUrl = `${siteUrl}/account/booking/${bookingId}`;

  const serviceClient = createSupabaseServiceRoleClient();
  const [{ data: staff }] = await Promise.all([
    serviceClient.from("admin_users").select("email").eq("status", "active"),
    sendCancellationRequestReceivedEmail({
      toEmail: customer.email,
      customerName: customer.name,
      productTitle,
      bookingCode: booking.booking_code,
      path,
      calculatedRefundIdr: calculatedRefundAmountIdr,
      bookingUrl,
    }),
  ]);

  await Promise.all(
    (staff ?? []).map((admin) =>
      sendNewCancellationStaffEmail({
        toEmail: admin.email,
        customerName: customer.name,
        productTitle,
        bookingCode: booking.booking_code,
        path,
        preferredResolutionLabel: CANCELLATION_PREFERRED_RESOLUTION_LABELS[preferredResolution],
        reviewUrl: `${siteUrl}/admin/cancellations/${inserted.id}`,
      })
    )
  );

  redirect(`/account/booking/${bookingId}?notice=${encodeURIComponent("Request submitted -- we'll review it soon.")}`);
}
