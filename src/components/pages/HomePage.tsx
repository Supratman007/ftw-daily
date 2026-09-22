import Link from "next/link";
import Image from "next/image";
import { ProductCardImage } from "@/components/ProductCardImage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatUsd, formatIdr, usdToIdr } from "@/lib/currency";
import { getUsdToIdrRate } from "@/lib/exchangeRate";
import { getHeroContent } from "@/lib/heroSettings";
import { PRODUCT_TYPE_LABELS } from "@/lib/products/types";
import type { Product } from "@/lib/products/types";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { HomeTestimonials } from "@/components/HomeTestimonials";
import { JsonLd } from "@/components/JsonLd";
import { SUPPORT_EMAIL, WHATSAPP_NUMBER, INSTAGRAM_URL, FACEBOOK_URL, TIKTOK_URL } from "@/lib/contact";
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
  const hero = await getHeroContent(locale);

  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const allItems = (products ?? []) as Product[];
  const exchangeRate = await getUsdToIdrRate();

  // Real, published reviews across every trip -- the site's actual
  // social proof (see HomeTestimonials.tsx). Best-rated, most-recent
  // first; capped at 6 so this stays a highlight reel, not a full
  // review archive (that's what each trip's own page is for).
  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, rating, title, body, products(title, title_id, translation_status, slug)")
    .eq("status", "published")
    .order("rating", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(6);
  const testimonials = (reviewRows ?? [])
    .map((r) => {
      const product = r.products as unknown as {
        title: string;
        title_id: string | null;
        translation_status: "none" | "draft" | "approved";
        slug: string;
      } | null;
      if (!product) return null;
      const productTitle =
        locale === "id" && product.translation_status === "approved" && product.title_id
          ? product.title_id
          : product.title;
      return { id: r.id, rating: r.rating, title: r.title, body: r.body, productTitle, productSlug: product.slug };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

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

  // Organization/TravelAgency structured data -- tells Google this is
  // a real local business (name, contact, social profiles) rather than
  // an anonymous page, which is what makes rich results (a knowledge
  // panel, a phone/WhatsApp link in search) possible at all. Every
  // field here already exists elsewhere in the app (lib/contact.ts) --
  // nothing invented, and sameAs only lists a social profile that's
  // actually configured via env var.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const sameAs = [INSTAGRAM_URL, FACEBOOK_URL, TIKTOK_URL].filter((url): url is string => Boolean(url));
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Adventure Lombok Booking",
    url: siteUrl,
    logo: `${siteUrl}/logo.jpg`,
    image: hero.imageUrl ?? `${siteUrl}/logo.jpg`,
    description:
      "Local Lombok tour operator since 2006 -- day tours, activities, Mount Rinjani treks, Gili Islands and Komodo trips, and car hire.",
    email: SUPPORT_EMAIL,
    ...(WHATSAPP_NUMBER ? { telephone: `+${WHATSAPP_NUMBER}` } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    <>
      <PageViewTracker path={locale === "id" ? "/id" : "/"} locale={locale} />
      <JsonLd data={organizationJsonLd} />
      <SiteHeader locale={locale} localeSwitcherBasePath="/" />

      {/* Full-width hero -- the mountain/wave strip is pinned to the
          bottom edge at a fixed height rather than filling the whole
          section, on purpose: the headline's length varies by screen
          width and by language (Indonesian runs longer than English),
          so this is the one layout that can never put dark ink text
          over the dark silhouette and lose contrast. Photo + text
          colors both come from the admin-editable hero (see
          getHeroContent() / /admin/settings) -- with no photo set this
          renders exactly as before (illustrated teal background, dark
          ink text); with one set, a dark scrim goes behind white text
          instead so it stays readable over whatever photo was chosen. */}
      <section className="relative overflow-hidden bg-teal-light">
        {hero.imageUrl && (
          <>
            <Image
              src={hero.imageUrl}
              alt=""
              fill
              priority
              unoptimized
              // The hero section is much wider/shorter on desktop than
              // on a phone, so object-cover's default center crop cuts
              // off more of the photo's lower half there -- shifting
              // the focal point down (object-[center_75%]) keeps
              // whatever's near the bottom of the photo (e.g. a
              // hammock) in frame on wide screens too, matching what
              // was already visible on mobile's taller crop.
              className="object-cover object-center sm:object-[center_75%]"
            />
            <div className="absolute inset-0 bg-ink/50" aria-hidden="true" />
          </>
        )}
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
          {/* Smaller font + tighter tracking on mobile than on a wider
              screen -- at the original text-[11px]/tracking-widest
              size, the default badge copy ("Local Lombok tour operator
              · since 2006") was just wide enough to wrap onto a second
              line on a phone, turning the rounded-full pill into an
              oversized stretched box. whitespace-nowrap plus the
              smaller mobile size keeps it on one line and the pill
              shape intact; sm and up goes back to the original size. */}
          <span
            className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide sm:px-3 sm:text-[11px] sm:tracking-widest ${
              hero.imageUrl ? "bg-white/20 text-white" : "bg-white/75 text-ocean"
            }`}
          >
            {hero.badge}
          </span>
          <h1
            className={`mt-4 max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl ${
              hero.imageUrl ? "text-white" : "text-ocean"
            }`}
          >
            {hero.headline}
          </h1>
          <p
            className={`mt-3 max-w-md text-base leading-relaxed sm:text-lg ${
              hero.imageUrl ? "text-white/90" : "text-ink"
            }`}
          >
            {hero.subheadline}
          </p>
        </div>
      </section>

      {/* Overlaps the hero's bottom edge on purpose (the search bar
          people actually want, put where they'll see it first). One
          non-wrapping row at every width, search/filters/button always
          side by side -- each field shrinks (flex-1 min-w-0) rather
          than wrapping onto its own line, and the button drops its
          label down to an icon-only square below the sm breakpoint so
          four controls in a row still fits a phone's width instead of
          getting cramped or overflowing. "Clear filters" sits on its
          own line below since it's secondary and only shows up once a
          search is active. */}
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative -mt-10 rounded-2xl border border-sand-deep bg-white p-4 shadow-lg sm:-mt-14 sm:p-5">
          <form method="GET" className="flex flex-col gap-2">
            <div className="flex flex-nowrap items-center gap-1.5 sm:gap-3">
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder={dict.searchPlaceholder}
                className={`${inputClass} min-w-0 flex-[1.5] px-2 sm:px-3`}
              />
              <select
                name="type"
                defaultValue={type ?? "all"}
                className={`${inputClass} min-w-0 flex-1 px-2 sm:px-3`}
              >
                <option value="all">{dict.allTypes}</option>
                {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="location"
                defaultValue={location ?? "all"}
                className={`${inputClass} min-w-0 flex-1 px-2 sm:px-3`}
              >
                <option value="all">{dict.allLocations}</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                aria-label={dict.searchButton}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-coral px-2.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark sm:px-4"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <span className="hidden sm:inline">{dict.searchButton}</span>
              </button>
            </div>
            {hasFilters && (
              <Link
                href={locale === "en" ? "/" : "/id"}
                className="self-start text-sm font-semibold text-teal hover:underline"
              >
                {dict.clear}
              </Link>
            )}
          </form>
        </div>
      </div>

      {/* One badge per line on a phone rather than letting them wrap
          two-per-row (flex-wrap's justify-center centers each wrapped
          line independently, so differently-sized lines never share a
          left edge). The stacked list itself is items-start -- so
          every icon lines up at the same left edge, not re-centered
          per line -- inside an outer justify-center that centers the
          whole block on the page as one unit. From sm up this reverts
          to the original single centered row, wide enough that all
          three fit side by side. */}
      <div className="mx-auto mt-10 flex max-w-5xl justify-center px-6 sm:mt-12">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-3">
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
      </div>

      <HomeTestimonials reviews={testimonials} locale={locale} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {hasFilters && <p className="text-sm text-ink-soft">{dict.resultsFound(items.length)}</p>}

        {allItems.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">{dict.noProductsYet}</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">{dict.noResults}</p>
        ) : (
          <>
            {!hasFilters && (
              <>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{dict.popularTripsKicker}</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-ocean">{dict.popularTrips}</p>
              </>
            )}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <Link
                  key={p.id}
                  href={locale === "en" ? `/p/${p.slug}` : `/id/p/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-sand-deep bg-white transition-all duration-200 hover:-translate-y-1 hover:border-teal/40 hover:shadow-lg"
                >
                  <div className="overflow-hidden">
                    <div className="transition-transform duration-300 group-hover:scale-105">
                      <ProductCardImage
                        src={p.cover_image_url}
                        alt=""
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        comingSoonLabel={dict.photoComingSoon}
                        className="h-52"
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-5">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                      {PRODUCT_TYPE_LABELS[p.product_type]}
                      {p.location ? ` · ${p.location}` : ""}
                    </p>
                    <h2 className="font-serif text-xl font-semibold text-ink">
                      {locale === "id" && p.translation_status === "approved" && p.title_id
                        ? p.title_id
                        : p.title}
                    </h2>
                    {p.adult_price_usd != null && (
                      <p className="mt-auto pt-2 text-sm font-semibold text-ocean">
                        {formatUsd(p.adult_price_usd)}{" "}
                        <span className="font-normal text-ink-soft">
                          ({formatIdr(usdToIdr(p.adult_price_usd, exchangeRate))})
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
