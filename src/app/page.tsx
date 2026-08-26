import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatUsd, formatIdr, usdToIdr } from "@/lib/currency";
import { PRODUCT_TYPE_LABELS } from "@/lib/products/types";
import type { Product } from "@/lib/products/types";
import { customerLogoutAction } from "./actions";

/**
 * Minimal "browse trips" list -- just enough to click through to a real
 * product and test checkout. This is intentionally bare-bones: no
 * search, filters, or categories yet. Those come later, once the
 * riskier parts (real payment, real booking) are proven out first.
 */
export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const [{ data: products }, { data: userData }] = await Promise.all([
    supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const items = (products ?? []) as Product[];
  const user = userData.user;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            booking.adventure-lombok.com
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-ocean">
            Adventure Lombok Booking
          </h1>
        </div>
        <div className="pt-1 text-sm">
          {user ? (
            <div className="flex items-center gap-3 text-ink-soft">
              <span>
                Hi, {(user.user_metadata?.full_name as string | undefined) || user.email}
              </span>
              <form action={customerLogoutAction}>
                <button type="submit" className="font-semibold text-coral-dark hover:underline">
                  Log out
                </button>
              </form>
            </div>
          ) : (
            <a href="/login" className="font-semibold text-teal hover:underline">
              Log in
            </a>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          No trips published yet — check back soon.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <a
              key={p.id}
              href={`/p/${p.slug}`}
              className="flex flex-col overflow-hidden rounded-2xl border border-sand-deep bg-white transition hover:shadow-md"
            >
              {p.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- prototype-stage listing; Next/Image optimization is a later polish pass
                <img src={p.cover_image_url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-sand" />
              )}
              <div className="flex flex-1 flex-col gap-1 p-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                  {PRODUCT_TYPE_LABELS[p.product_type]}
                  {p.location ? ` · ${p.location}` : ""}
                </p>
                <h2 className="font-serif text-lg font-semibold text-ink">{p.title}</h2>
                {p.adult_price_usd != null && (
                  <p className="mt-auto pt-2 text-sm font-semibold text-ocean">
                    {formatUsd(p.adult_price_usd)}{" "}
                    <span className="font-normal text-ink-soft">
                      ({formatIdr(usdToIdr(p.adult_price_usd))})
                    </span>
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
