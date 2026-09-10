import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { pushReviewToWebsite } from "@/lib/reviews/pushToWebsite";
import { MAX_PUSH_ATTEMPTS } from "@/lib/reviews/types";

/**
 * Spec §6n: "Retry the push a few times in the background... if it
 * keeps failing, quietly log it for you to notice rather than
 * surfacing an error to the customer." Scheduled by vercel.json's
 * crons entry, same CRON_SECRET check as /api/cron/review-requests.
 *
 * Only ever picks up reviews already marked "failed" -- a fresh
 * "pending" is handled synchronously at publish time
 * (submitReviewAction / approveReviewAction); this is purely the
 * retry path for whichever of those attempts didn't succeed.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, rating, title, body, push_attempts, bookings(customers(name)), products(source_url)")
    .eq("pushed_to_website", "failed")
    .lt("push_attempts", MAX_PUSH_ATTEMPTS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let retried = 0;
  let succeeded = 0;

  for (const review of reviews ?? []) {
    const product = review.products as unknown as { source_url: string | null } | null;
    const customer = (review.bookings as unknown as { customers: { name: string } | null } | null)
      ?.customers;
    if (!product?.source_url || !customer) continue;

    retried++;
    const pushed = await pushReviewToWebsite({
      reviewId: review.id,
      sourceUrl: product.source_url,
      rating: review.rating,
      reviewerName: customer.name,
      title: review.title,
      body: review.body,
    });

    if (pushed) succeeded++;
    else {
      console.error(
        `Review ${review.id} still hasn't pushed to the website after ${review.push_attempts + 1} attempt(s).`
      );
    }

    await supabase
      .from("reviews")
      .update({
        pushed_to_website: pushed ? "pushed" : "failed",
        push_attempts: review.push_attempts + 1,
      })
      .eq("id", review.id);
  }

  return NextResponse.json({ ok: true, retried, succeeded });
}
