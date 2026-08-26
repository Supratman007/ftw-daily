import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatUsd, formatIdr, usdToIdr } from "@/lib/currency";
import { PRODUCT_TYPE_LABELS } from "@/lib/products/types";
import type { Product } from "@/lib/products/types";
import { customerLogoutAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

/**
 * Matches spec §3/§4's "Smart Search & Filters" step of the core flow.
 * The catalog here is small (tens of products, not thousands, per
 * spec §5) so this fetches every active product once and filters in
 * plain JS -- simpler than building out Supabase query-building for a
 * dataset this size, and it's what lets the location dropdown list only
 * locations that actually have something in them, without a second
 * "distinct" query.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
}) {
  const { q, type, location } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const [{ data: products }, { data: userData }] = await Promise.all([
    supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const allItems = (products ?? []) as Product[];
  const user = userData.user;

  const locations = Array.from(new Set(allItems.map((p) => p.location).filter((l): l is string => !!l))).sort();

  const query = (q ?? "").trim().toLowerCase();
  const items = allItems.filter((p) => {
    if (type && type !== "all" && p.product_type !== type) return false;
    if (location && location !== "all" && p.location !== location) return false;
    if (query) {
      const haystack = `${p.title} ${p.location ?? ""} ${p.category ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const hasFilters = Boolean(q || (type && type !== "all") || (location && location !== "all"));

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

      <form method="GET" className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search trips, activities, locations…"
          className={`${inputClass} flex-1 basis-64`}
        />
        <select name="type" defaultValue={type ?? "all"} className={`${inputClass} w-auto`}>
          <option value="all">All types</option>
          {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="location" defaultValue={location ?? "all"} className={`${inputClass} w-auto`}>
          <option value="all">All locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
        {hasFilters && (
          <Link
            href="/"
            className="flex items-center px-2 text-sm font-semibold text-teal hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      {hasFilters && (
        <p className="mt-4 text-sm text-ink-soft">
          {items.length} trip{items.length === 1 ? "" : "s"} found
        </p>
      )}

      {allItems.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          No trips published yet — check back soon.
        </p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          No trips match those filters — try clearing one and searching again.
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
