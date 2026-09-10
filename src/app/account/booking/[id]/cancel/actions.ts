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
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024; // 5MB
const EVIDENCE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** `locale` is bound by RequestCancellationPage, same as everywhere
 * else in this account area -- every redirect below (error or
 * success) keeps the visitor in that language. */
export async function submitCancellationRequestAction(bookingId: string, locale: Locale, formData: FormData) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const errors = getDictionary(locale).account.errors;
  const customer = await requireCustomer(`${pathPrefix}/account/booking/${bookingId}/cancel`);

  function fail(message: string): never {
    redirect(`${pathPrefix}/account/booking/${bookingId}/cancel?error=${encodeURIComponent(message)}`);
  }

  const pathRaw = String(formData.get("path") ?? "");
  if (pathRaw !== "standard" && pathRaw !== "force_majeure") {
    fail(errors.pleaseChooseRequestType);
  }
  const path = pathRaw as CancellationPath;

  // Optional -- a customer who hasn't decided yet, or just wants to
  // talk to us first, can leave this blank entirely.
  const preferredResolutionRaw = String(formData.get("preferred_resolution") ?? "");
  let preferredResolution: CancellationPreferredResolution | null = null;
  if (preferredResolutionRaw) {
    if (!["refund", "reschedule", "gift_voucher"].includes(preferredResolutionRaw)) {
      fail(errors.pleaseChooseResolution);
    }
    preferredResolution = preferredResolutionRaw as CancellationPreferredResolution;
    if (path === "force_majeure" && preferredResolution === "refund") {
      fail(errors.forceMajeureNoRefund);
    }
  }

  let preferredNewDate: string | null = null;
  if (preferredResolution === "reschedule") {
    const raw = String(formData.get("preferred_new_date") ?? "").trim();
    if (!raw || Number.isNaN(Date.parse(raw))) {
      fail(errors.pleaseChooseRescheduleDate);
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (raw <= todayStr) {
      fail(errors.pleaseChooseFutureDate);
    }
    preferredNewDate = raw;
  }

  let preferredGiftRecipientName: string | null = null;
  let preferredGiftRecipientEmail: string | null = null;
  if (preferredResolution === "gift_voucher") {
    preferredGiftRecipientName = String(formData.get("preferred_gift_recipient_name") ?? "").trim();
    preferredGiftRecipientEmail = String(formData.get("preferred_gift_recipient_email") ?? "")
      .trim()
      .toLowerCase();
    if (!preferredGiftRecipientName) {
      fail(errors.pleaseEnterRecipientName);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(preferredGiftRecipientEmail)) {
      fail(errors.pleaseEnterValidEmail);
    }
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    fail(errors.pleaseTellUsWhatHappened);
  }

  const evidenceFile = formData.get("evidence");
  if (path === "force_majeure") {
    if (!(evidenceFile instanceof File) || evidenceFile.size === 0) {
      fail(errors.uploadEvidence);
    }
    if (!(evidenceFile.type in EVIDENCE_EXT_BY_MIME)) {
      fail(errors.evidenceFileType);
    }
    if (evidenceFile.size > MAX_EVIDENCE_BYTES) {
      fail(errors.evidenceTooLarge);
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
    fail(errors.bookingNotFound);
  }
  if (booking.status !== "paid_confirmed") {
    fail(errors.onlyConfirmedCanCancel);
  }

  const { count: pendingCount } = await supabase
    .from("cancellation_requests")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("status", "pending_review");
  if ((pendingCount ?? 0) > 0) {
    fail(errors.alreadyPendingRequest);
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
      preferred_new_date: preferredNewDate,
      preferred_gift_recipient_name: preferredGiftRecipientName,
      preferred_gift_recipient_email: preferredGiftRecipientEmail,
      calculated_refund_percent: calculatedRefundPercent,
      calculated_refund_amount_idr: calculatedRefundAmountIdr,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    fail(errors.couldntSubmitRequest(insertError?.message ?? "please try again."));
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
      locale: customer.preferred_locale,
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
        preferredResolutionLabel: preferredResolution
          ? CANCELLATION_PREFERRED_RESOLUTION_LABELS[preferredResolution]
          : "No preference stated",
        preferredNewDate,
        preferredGiftRecipient:
          preferredGiftRecipientName && preferredGiftRecipientEmail
            ? `${preferredGiftRecipientName} (${preferredGiftRecipientEmail})`
            : null,
        reviewUrl: `${siteUrl}/admin/cancellations/${inserted.id}`,
      })
    )
  );

  redirect(`${pathPrefix}/account/booking/${bookingId}?notice=${encodeURIComponent(errors.requestSubmittedNotice)}`);
}
