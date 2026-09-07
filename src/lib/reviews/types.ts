/** Customer reviews (spec §6d). Rating-based moderation: 4-5 stars
 * publish immediately, 3 stars or below hold for an admin to approve,
 * edit, or reject at /admin/moderation. */
export type ReviewStatus = "published" | "pending_moderation" | "rejected";

export interface Review {
  id: string;
  product_id: string;
  booking_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  created_at: string;
  published_at: string | null;
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  published: "Published",
  pending_moderation: "Pending moderation",
  rejected: "Rejected",
};

/** A review at this rating or above publishes immediately; below it,
 * a review holds for admin moderation first (spec §6d). */
export const AUTO_PUBLISH_MIN_RATING = 4;

/** How long a review-request link stays valid before it can no longer
 * be used (spec §6d). */
export const REVIEW_TOKEN_EXPIRY_DAYS = 30;
