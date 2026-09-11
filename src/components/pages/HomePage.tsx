import Link from "next/link";
import { ProductCardImage } from "@/components/ProductCardImage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatUsd, formatIdr, usdToIdr } from "@/lib/currency";
import { PRODUCT_TYPE_LABELS } from "@/lib/products/types";
import type { Product } from "@/lib/products/types";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

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
 *
 * Shared by both src/app/page.tsx (English, "/") and
 * src/app/id/page.tsx (Indonesian, "/id") -- one implementation, two
 * thin route entrypoints that just pick a locale. Trip titles,
 * locations, categories and type labels stay in whatever language
 * they were entered in the admin (English today) regardless of
 * `locale` -- only this page's own fixed text is translated so far.
 */
export async function HomePage({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
  locale: Locale;
}) {
  const dict = getDictionary(locale).home;
  const { q, type, location } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const allItems = (products ?? []) as Product[];

  const locations = Array.from(new Set(allItems.map((p) => p.location).filter((l): l is string => !!l))).sort();

  const query = (q ?? "").trim().toLowerCase();
  const items = allItems.filter((p) => {
    if (type && type !== "all" && p.product_type !== type) return false;
    if (location && location !== "all" && p.location !== location) return false;
    if (query) {
      // Matches on the Indonesian title too (when approved) so a
      // customer searching in Indonesian on /id still finds trips
      // whose English title doesn't contain the words they typed.
      const translatedTitle = locale === "id" && p.translation_status === "approved" ? p.title_id : null;
      const haystack = `${p.title} ${translatedTitle ?? ""} ${p.location ?? ""} ${p.category ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const hasFilters = Boolean(q || (type && type !== "all") || (location && location !== "all"));

  return (
    <>
      <PageViewTracker path={locale === "id" ? "/id" : "/"} locale={locale} />
      <SiteHeader locale={locale} localeSwitcherBasePath="/" />

      {/* Full-width hero -- the mountain/wave strip is pinned to the
          bottom edge at a fixed height rather than filling the whole
          section, on purpose: the headline's length varies by screen
          width and by language (Indonesian runs longer than English),
          so this is the one layout that can never put dark ink text
          over the dark silhouette and lose contrast. */}
      <section className="relative overflow-hidden bg-teal-light">
        <svg
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-16 w-full sm:h-24"
          aria-hidden="true"
        >
          <path
            d="M0,140 L160,60 L260,110 L400,40 L540,110 L680,70 L820,120 L960,80 L1440,140 L1440,200 L0,200 Z"
            fill="#0f3a3d"
            opacity="0.92"
          />
          <path
            d="M0,170 C220,150 340,185 560,165 C780,145 900,180 1120,160 C1260,148 1360,158 1440,153 L1440,200 L0,200 Z"
            fill="#166e73"
          />
        </svg>

        <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-10 sm:pb-28 sm:pt-14">
          <span className="inline-block rounded-full bg-white/75 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ocean">
            {dict.heroBadge}
          </span>
          <h1 className="mt-4 max-w-xl font-serif text-3xl font-semibold leading-tight text-ocean sm:text-4xl md:text-5xl">
            {dict.heroHeadline}
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-ink sm:text-lg">
            {dict.heroSubheadline}
          </p>
        </div>
      </section>

      {/* Overlaps the hero's bottom edge on purpose (the search bar
          people actually want, put where they'll see it first). */}
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative -mt-10 rounded-2xl border border-sand-deep bg-white p-4 shadow-lg sm:-mt-14 sm:p-5">
          <form method="GET" className="flex flex-wrap gap-3">
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder={dict.searchPlaceholder}
              className={`${inputClass} flex-1 basis-64`}
            />
            <select name="type" defaultValue={type ?? "all"} className={`${inputClass} w-auto`}>
              <option value="all">{dict.allTypes}</option>
              {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="location" defaultValue={location ?? "all"} className={`${inputClass} w-auto`}>
              <option value="all">{dict.allLocations}</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
            >
              {dict.searchButton}
            </button>
            {hasFilters && (
              <Link
                href={locale === "en" ? "/" : "/id"}
                className="flex items-center px-2 text-sm font-semibold text-teal hover:underline"
              >
                {dict.clear}
              </Link>
            )}
          </form>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-5xl flex-wrap justify-center gap-x-8 gap-y-3 px-6 sm:mt-12">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166e73" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          {dict.trustLocal}
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166e73" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18" />
            <path d="M8 3v4M16 3v4" />
            <path d="M9 15l2 2 4-4" />
          </svg>
          {dict.trustAvailability}
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166e73" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
          {dict.trustSecure}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {hasFilters && <p className="text-sm text-ink-soft">{dict.resultsFound(items.length)}</p>}

        {allItems.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">{dict.noProductsYet}</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">{dict.noResults}</p>
        ) : (
          <>
            {!hasFilters && (
              <p className="font-serif text-2xl font-semibold text-ocean">{dict.popularTrips}</p>
            )}
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <Link
                  key={p.id}
                  href={locale === "en" ? `/p/${p.slug}` : `/id/p/${p.slug}`}
                  className="flex flex-col overflow-hidden rounded-2xl border border-sand-deep bg-white transition hover:shadow-md"
                >
                  <ProductCardImage
                    src={p.cover_image_url}
                    alt=""
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    comingSoonLabel={dict.photoComingSoon}
                    className="h-40"
                  />
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                      {PRODUCT_TYPE_LABELS[p.product_type]}
                      {p.location ? ` · ${p.location}` : ""}
                    </p>
                    <h2 className="font-serif text-lg font-semibold text-ink">
                      {locale === "id" && p.translation_status === "approved" && p.title_id
                        ? p.title_id
                        : p.title}
                    </h2>
                    {p.adult_price_usd != null && (
                      <p className="mt-auto pt-2 text-sm font-semibold text-ocean">
                        {formatUsd(p.adult_price_usd)}{" "}
                        <span className="font-normal text-ink-soft">
                          ({formatIdr(usdToIdr(p.adult_price_usd))})
                        </span>
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter locale={locale} />
      <SiteCookieNotice locale={locale} />
    </>
  );
}
