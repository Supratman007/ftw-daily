/** Customer reviews (spec §6d). Rating-based moderation: 4-5 stars
 * publish immediately, 3 stars or below hold for an admin to approve,
 * edit, or reject at /admin/moderation. */
export type ReviewStatus = "published" | "pending_moderation" | "rejected";

/** Spec §6n: whether a published review has been pushed over to the
 * matching adventure-lombok.com product page. not_applicable covers
 * both "not published yet" and "product has no source_url to push
 * to" -- neither one is ever going to push, so there's nothing useful
 * to distinguish between them for. */
export type ReviewPushStatus = "not_applicable" | "pending" | "pushed" | "failed";

export interface Review {
  id: string;
  product_id: string;
  booking_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  pushed_to_website: ReviewPushStatus;
  push_attempts: number;
  created_at: string;
  published_at: string | null;
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  published: "Published",
  pending_moderation: "Pending moderation",
  rejected: "Rejected",
};

export const REVIEW_PUSH_STATUS_LABELS: Record<ReviewPushStatus, string> = {
  not_applicable: "—",
  pending: "Not yet on website",
  pushed: "On adventure-lombok.com",
  failed: "Couldn't push to website",
};

/** The retry cron (/api/cron/retry-review-pushes) stops trying after
 * this many attempts and leaves it "failed" for an admin to notice on
 * the moderation page, rather than retrying a genuinely broken push
 * forever (spec §6n: "if it keeps failing, quietly log it"). */
export const MAX_PUSH_ATTEMPTS = 5;

/** A review at this rating or above publishes immediately; below it,
 * a review holds for admin moderation first (spec §6d). */
export const AUTO_PUBLISH_MIN_RATING = 4;

/** How long a review-request link stays valid before it can no longer
 * be used (spec §6d). */
export const REVIEW_TOKEN_EXPIRY_DAYS = 30;
