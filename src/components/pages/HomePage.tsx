import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatUsd, formatIdr, usdToIdr } from "@/lib/currency";
import { PRODUCT_TYPE_LABELS } from "@/lib/products/types";
import type { Product } from "@/lib/products/types";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
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
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            booking.adventure-lombok.com
          </p>
          <LocaleSwitcher locale={locale} basePath="/" />
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ocean">
          Adventure Lombok Booking
        </h1>

        <form method="GET" className="mt-6 flex flex-wrap gap-3">
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
            className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
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

        {hasFilters && <p className="mt-4 text-sm text-ink-soft">{dict.resultsFound(items.length)}</p>}

        {allItems.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">{dict.noProductsYet}</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">{dict.noResults}</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link
                key={p.id}
                href={locale === "en" ? `/p/${p.slug}` : `/id/p/${p.slug}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-sand-deep bg-white transition hover:shadow-md"
              >
                {p.cover_image_url ? (
                  <div className="relative h-40 w-full">
                    <Image
                      src={p.cover_image_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 w-full bg-sand" />
                )}
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
        )}
      </main>
      <SiteFooter locale={locale} />
      <SiteCookieNotice locale={locale} />
    </>
  );
}
