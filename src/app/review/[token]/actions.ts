"use server";

import { redirect } from "next/navigation";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { sendAdminNewReviewEmail } from "@/lib/email/resend";
import { AUTO_PUBLISH_MIN_RATING } from "@/lib/reviews/types";

/**
 * Spec §6d: the review-request email's link proves eligibility on its
 * own -- no login required. Runs entirely through the service-role
 * client (there's often no session at all here), same "customer-
 * triggered write, no matching RLS policy" pattern as the Rinjani
 * passport upload and the self-service pickup-time change.
 */
export async function submitReviewAction(token: string, formData: FormData) {
  const supabase = createSupabaseServiceRoleClient();

  function fail(message: string): never {
    redirect(`/review/${token}?error=${encodeURIComponent(message)}`);
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, products(title, slug), customers(name)")
    .eq("review_token", token)
    .maybeSingle();

  if (!booking) {
    fail("This review link isn't valid.");
  }
  if (booking.review_token_used_at) {
    fail("This review link has already been used.");
  }
  if (booking.review_token_expires_at && new Date(booking.review_token_expires_at) < new Date()) {
    fail("This review link has expired -- contact us if you'd still like to leave a review.");
  }

  const ratingRaw = Number(formData.get("rating"));
  const rating = Number.isInteger(ratingRaw) ? ratingRaw : 0;
  if (rating < 1 || rating > 5) {
    fail("Please choose a star rating.");
  }
  const title = String(formData.get("title") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim() || null;

  const published = rating >= AUTO_PUBLISH_MIN_RATING;
  const now = new Date().toISOString();

  const { error: insertError } = await supabase.from("reviews").insert({
    product_id: booking.product_id,
    booking_id: booking.id,
    customer_id: booking.customer_id,
    rating,
    title,
    body,
    status: published ? "published" : "pending_moderation",
    published_at: published ? now : null,
  });
  if (insertError) {
    fail(`Couldn't submit your review: ${insertError.message}`);
  }

  // Marked used regardless of what happens with the notification email
  // below -- the review itself is already saved at this point, and a
  // failed email shouldn't let the same link be used to submit twice.
  await supabase.from("bookings").update({ review_token_used_at: now }).eq("id", booking.id);

  const product = booking.products as unknown as { title: string; slug: string } | null;
  const customer = booking.customers as unknown as { name: string } | null;
  if (product && customer) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data: staff } = await supabase.from("admin_users").select("email").eq("status", "active");
    await Promise.all(
      (staff ?? []).map((admin) =>
        sendAdminNewReviewEmail({
          toEmail: admin.email,
          productTitle: product.title,
          customerName: customer.name,
          rating,
          reviewTitle: title,
          reviewBody: body,
          published,
          reviewUrl: published ? `${siteUrl}/p/${product.slug}` : `${siteUrl}/admin/moderation`,
        })
      )
    );
  }

  redirect(`/review/${token}?submitted=1`);
}
