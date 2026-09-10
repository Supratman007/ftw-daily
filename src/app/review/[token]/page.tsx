import { Fragment } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { submitReviewAction } from "./actions";

/**
 * Spec §6d's one-time review link -- `/review/[token]`, no login
 * required, the token itself proves eligibility. Reached from the
 * review-request email (spec §6g) sent by the daily cron, or from the
 * "Write a review" shortcut on a completed booking's account page.
 */
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { token } = await params;
  const { submitted, error } = await searchParams;

  const supabase = createSupabaseServiceRoleClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, slot_date, review_token_expires_at, review_token_used_at, products(title)")
    .eq("review_token", token)
    .maybeSingle();

  const product = booking?.products as unknown as { title: string } | null;
  const isExpired = booking?.review_token_expires_at
    ? new Date(booking.review_token_expires_at) < new Date()
    : false;

  return (
    <>
      <PageViewTracker path="/review/[token]" locale="en" />
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        {!booking ? (
          <>
            <h1 className="font-serif text-2xl font-semibold text-ink">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Double-check the link from your email, or contact us if you think this is a mistake.
            </p>
          </>
        ) : booking.review_token_used_at ? (
          <>
            <h1 className="font-serif text-2xl font-semibold text-ink">
              {submitted ? "Thanks for your review!" : "You've already reviewed this trip"}
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              {submitted
                ? "It's either already live on the product page, or being reviewed by our team first -- either way, thank you for taking the time."
                : "Only one review per trip -- thanks again for sharing yours."}
            </p>
          </>
        ) : isExpired ? (
          <>
            <h1 className="font-serif text-2xl font-semibold text-ink">This review link has expired</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Review links are valid for 30 days. Contact us if you&apos;d still like to leave a
              review for {product?.title ?? "your trip"}.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
              {new Date(booking.slot_date).toLocaleDateString()}
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">
              How was {product?.title ?? "your trip"}?
            </h1>

            {error && (
              <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
                {error}
              </p>
            )}

            <form action={submitReviewAction.bind(null, token)} className="mt-6 flex flex-col gap-4">
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Rating
                </legend>
                {/* Plain radios, styled into clickable stars via the
                    .star-rating rules in globals.css -- see the comment
                    there for how the reversed DOM order pulls this off
                    with no JavaScript. */}
                <div className="star-rating mt-2">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <Fragment key={n}>
                      <input type="radio" id={`star-${n}`} name="rating" value={n} required />
                      <label htmlFor={`star-${n}`} title={`${n} star${n === 1 ? "" : "s"}`}>
                        ★
                      </label>
                    </Fragment>
                  ))}
                </div>
              </fieldset>

              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Title (optional)
                <input
                  type="text"
                  name="title"
                  placeholder="Sum it up in a few words"
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Your review (optional)
                <textarea
                  name="body"
                  rows={5}
                  placeholder="What stood out? Anything future travelers should know?"
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                />
              </label>

              <button
                type="submit"
                className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white"
              >
                Submit review
              </button>
            </form>
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-block text-sm font-semibold text-teal hover:underline"
        >
          ← Back to home
        </Link>
      </main>
      <SiteFooter />
      <SiteCookieNotice />
    </>
  );
}
