import Link from "next/link";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

export interface HomeTestimonial {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  productTitle: string;
  productSlug: string;
}

/**
 * Real, already-collected customer reviews (spec §6d's review system,
 * migration 0037) surfaced on the homepage -- the site's actual social
 * proof, not fabricated testimonials. Same restraint as
 * ProductReviews.tsx (the per-trip version this mirrors): no
 * customer name shown, matching that component's existing privacy
 * choice, and renders nothing at all when there isn't at least one
 * published review yet rather than an empty placeholder section.
 */
export function HomeTestimonials({
  reviews,
  locale,
}: {
  reviews: HomeTestimonial[];
  locale: Locale;
}) {
  if (reviews.length === 0) return null;
  const dict = getDictionary(locale).home;
  const pathPrefix = locale === "id" ? "/id" : "";

  return (
    <div className="mx-auto mt-16 max-w-5xl px-6 sm:mt-20">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{dict.testimonialsKicker}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-ocean">{dict.testimonialsHeading}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <div key={r.id} className="flex flex-col rounded-2xl border border-sand-deep bg-white p-6">
            <p className="text-coral">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
            {r.title && <p className="mt-3 break-words font-serif text-base font-semibold text-ink">{r.title}</p>}
            {r.body && (
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
                {r.body}
              </p>
            )}
            <Link
              href={`${pathPrefix}/p/${r.productSlug}`}
              className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal hover:underline"
            >
              {r.productTitle}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
