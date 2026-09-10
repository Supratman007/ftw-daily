"use server";

import { redirect } from "next/navigation";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pushReviewToWebsite } from "@/lib/reviews/pushToWebsite";

/** Approve a held review (spec §6d) -- publishes it to the product
 * page as-is. Also accepts an edited title/body if the caller sends
 * one (spec's "approve, edit, or reject") -- the moderation page
 * doesn't have inline-edit fields yet, but this stays ready for that
 * without another migration. */
export async function approveReviewAction(reviewId: string, formData: FormData) {
  await requireAdminSection("moderation");
  const editedTitle = String(formData.get("title") ?? "").trim();
  const editedBody = String(formData.get("body") ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("id, rating, title, body, bookings(customers(name)), products(source_url)")
    .eq("id", reviewId)
    .maybeSingle();

  const finalTitle = editedTitle || review?.title || null;
  const finalBody = editedBody || review?.body || null;
  const product = review?.products as unknown as { source_url: string | null } | null;
  const customer = (review?.bookings as unknown as { customers: { name: string } | null } | null)
    ?.customers;
  // Spec §6n -- only ever pushable if the product actually has a
  // matching adventure-lombok.com page on file.
  const canPush = Boolean(product?.source_url);

  const update: {
    status: string;
    published_at: string;
    title?: string;
    body?: string;
    pushed_to_website?: string;
  } = {
    status: "published",
    published_at: new Date().toISOString(),
  };
  if (editedTitle) update.title = editedTitle;
  if (editedBody) update.body = editedBody;
  if (canPush) update.pushed_to_website = "pending";

  await supabase.from("reviews").update(update).eq("id", reviewId);

  if (canPush && product?.source_url && customer && review) {
    const pushed = await pushReviewToWebsite({
      reviewId: review.id,
      sourceUrl: product.source_url,
      rating: review.rating,
      reviewerName: customer.name,
      title: finalTitle,
      body: finalBody,
    });
    await supabase
      .from("reviews")
      .update({ pushed_to_website: pushed ? "pushed" : "failed", push_attempts: 1 })
      .eq("id", reviewId);
  }

  redirect("/admin/moderation");
}

/** Rejects a held review -- never shown publicly, not even to the
 * reviewer (spec §6d: they just see it as "being reviewed", never a
 * visible rejected state). */
export async function rejectReviewAction(reviewId: string) {
  await requireAdminSection("moderation");
  const supabase = await createSupabaseServerClient();
  await supabase.from("reviews").update({ status: "rejected" }).eq("id", reviewId);
  redirect("/admin/moderation");
}
