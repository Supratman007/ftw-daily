export interface ProductReviewSummary {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  published_at: string | null;
}

/** Spec §6d: the average rating + review count near the top of the
 * page (already part of the product card design), plus the list of
 * published reviews beneath everything else -- shared across all four
 * product types (Tours, Activities, Car Hire, Transport can all be
 * reviewed) so it's built once here rather than inside each layout
 * branch. Renders nothing at all for a product with no reviews yet,
 * rather than an empty "no reviews" placeholder that would just be
 * distracting noise on a brand-new listing. */
export function ProductReviews({
  reviews,
  averageRating,
}: {
  reviews: ProductReviewSummary[];
  averageRating: number | null;
}) {
  if (reviews.length === 0) return null;

  return (
    <div className="mt-10 border-t border-sand-deep pt-8">
      <div className="flex items-baseline gap-2">
        <h2 className="font-serif text-xl font-semibold text-ink">Reviews</h2>
        {averageRating !== null && (
          <span className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{averageRating.toFixed(1)}</span> ★ ·{" "}
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-sand-deep bg-white p-5 text-sm">
            <p className="text-[#E1613C]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
            {r.title && <p className="mt-2 break-words font-semibold text-ink">{r.title}</p>}
            {r.body && (
              <p className="mt-1 whitespace-pre-wrap break-words text-ink-soft">{r.body}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
