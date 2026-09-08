import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/reviews/types";
import { approveReviewAction, rejectReviewAction } from "./actions";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  created_at: string;
  bookings: { booking_code: string; products: { title: string } | null; customers: { name: string } | null } | null;
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "pending_moderation", label: "Pending moderation" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

/**
 * Spec §6d/§4: /admin/moderation, the review queue for held reviews
 * (3 stars or below) -- same "customer-initiated request → staff
 * reviews" pattern already used at /admin/requests, /admin/
 * cancellations, and agent verification.
 */
export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeFilter = status ?? "pending_moderation";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("reviews")
    .select("id, rating, title, body, status, created_at, bookings(booking_code, products(title), customers(name))")
    .order("created_at", { ascending: false });
  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }
  const { data } = await query;
  const reviews = (data ?? []) as unknown as ReviewRow[];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Review moderation</h1>
      <p className="mt-1 text-sm text-ink-soft">
        4-5 star reviews publish automatically. 3 stars or below land here first.
      </p>

      <div className="mt-4 flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/moderation?status=${f.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              activeFilter === f.value
                ? "border-teal bg-[#E3F2F1] text-teal"
                : "border-sand-deep text-ink-soft hover:bg-sand"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {reviews.length === 0 && <p className="text-sm text-ink-soft">Nothing here.</p>}

        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-sand-deep bg-white p-6 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">
                {r.bookings?.products?.title ?? "Trip"} · {r.bookings?.customers?.name ?? "Customer"}
              </p>
              <span className="text-xs font-semibold uppercase text-ink-soft">
                {REVIEW_STATUS_LABELS[r.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              {r.bookings?.booking_code} · {new Date(r.created_at).toLocaleDateString()}
            </p>
            <p className="mt-2 text-[#E1613C]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
            {r.title && <p className="mt-2 break-words font-semibold text-ink">{r.title}</p>}
            {r.body && (
              <p className="mt-1 whitespace-pre-wrap break-words text-ink-soft">{r.body}</p>
            )}

            {r.status === "pending_moderation" && (
              <div className="mt-4 flex gap-2 border-t border-sand-deep pt-4">
                <form action={approveReviewAction.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-white"
                  >
                    Approve &amp; publish
                  </button>
                </form>
                <form action={rejectReviewAction.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-coral px-4 py-2 text-xs font-semibold text-coral-dark"
                  >
                    Reject
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
