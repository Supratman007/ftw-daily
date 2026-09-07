"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Approve a held review (spec §6d) -- publishes it to the product
 * page as-is. Also accepts an edited title/body if the caller sends
 * one (spec's "approve, edit, or reject") -- the moderation page
 * doesn't have inline-edit fields yet, but this stays ready for that
 * without another migration. */
export async function approveReviewAction(reviewId: string, formData: FormData) {
  await requireAdmin();
  const editedTitle = String(formData.get("title") ?? "").trim();
  const editedBody = String(formData.get("body") ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const update: { status: string; published_at: string; title?: string; body?: string } = {
    status: "published",
    published_at: new Date().toISOString(),
  };
  if (editedTitle) update.title = editedTitle;
  if (editedBody) update.body = editedBody;

  await supabase.from("reviews").update(update).eq("id", reviewId);

  redirect("/admin/moderation");
}

/** Rejects a held review -- never shown publicly, not even to the
 * reviewer (spec §6d: they just see it as "being reviewed", never a
 * visible rejected state). */
export async function rejectReviewAction(reviewId: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  await supabase.from("reviews").update({ status: "rejected" }).eq("id", reviewId);
  redirect("/admin/moderation");
}
