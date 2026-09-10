import "server-only";

interface PushReviewParams {
  reviewId: string;
  sourceUrl: string;
  rating: number;
  reviewerName: string;
  title: string | null;
  body: string | null;
}

/**
 * Spec §6n: push a published review to the matching product page on
 * adventure-lombok.com, via the companion WordPress plugin's REST
 * endpoint (see wordpress-plugin/ in this repo). Never throws -- a
 * failed push should never block or delay the review going live in
 * the app, the one place that matters most; the caller marks the
 * review pushed/failed based on the return value, and the retry cron
 * (/api/cron/retry-review-pushes) picks up any failures later.
 *
 * Both env vars are optional by design: a product with no matching
 * WordPress setup yet just never gets its reviews pushed, rather than
 * erroring.
 */
export async function pushReviewToWebsite(params: PushReviewParams): Promise<boolean> {
  const url = process.env.WORDPRESS_REVIEW_PUSH_URL;
  const secret = process.env.WORDPRESS_REVIEW_PUSH_SECRET;
  if (!url || !secret) return false;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-ALR-Secret": secret },
      body: JSON.stringify({
        source_url: params.sourceUrl,
        rating: params.rating,
        reviewer_name: params.reviewerName,
        title: params.title,
        body: params.body,
        review_id: params.reviewId,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch (err) {
    console.error(`Review push failed for review ${params.reviewId}:`, err);
    return false;
  }
}
