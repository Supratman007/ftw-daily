import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import { PRODUCT_TYPE_LABELS, type Product } from "@/lib/products/types";
import type {
  CarType,
  CarPackage,
  CarPackagePrice,
  MeetingPoint,
  TransportPrice,
  TransportVehicleType,
} from "@/lib/cars/types";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { ProductGallery } from "@/components/ProductGallery";
import { CarHireProductSection } from "@/components/CarHireProductSection";
import { TransportProductSection } from "@/components/TransportProductSection";
import { startCheckoutAction, startCarHireCheckoutAction, startTransportCheckoutAction } from "@/app/p/[slug]/actions";
import { earliestBookableDate } from "@/lib/products/leadTime";
import { ProductReviews, type ProductReviewSummary } from "@/components/ProductReviews";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

interface RelatedProduct {
  id: string;
  slug: string;
  title: string;
  title_id: string | null;
  translation_status: "none" | "draft" | "approved";
  cover_image_url: string | null;
  location: string | null;
  product_type: Product["product_type"];
  adult_price_usd: number | null;
}

/**
 * Shared by src/app/p/[slug]/page.tsx (English, "/p/slug") and
 * src/app/id/p/[slug]/page.tsx (Indonesian, "/id/p/slug"). Trip
 * titles/descriptions/locations stay whatever language they were
 * entered in the admin (English today) regardless of `locale` -- only
 * this page's own fixed text (labels, buttons, notices) is translated.
 *
 * The Car Hire and Transport booking forms themselves (CarHireBookingForm
 * / TransportBookingForm, reached through CarHireProductSection /
 * TransportProductSection below) are translated too, via the
 * carHireForm / transportForm dictionary sections passed down as
 * formDict.
 */
export async function ProductPage({
  params,
  searchParams,
  locale,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    date?: string;
    pax?: string;
    discount_code?: string;
    hotel_name?: string;
    room_number?: string;
    error?: string;
  }>;
  locale: Locale;
}) {
  const fullDict = getDictionary(locale);
  const dict = fullDict.product;
  const { slug } = await params;
  const {
    date,
    pax,
    discount_code: discountCode,
    hotel_name: hotelName,
    room_number: roomNumber,
    error,
  } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!product) {
    notFound();
  }

  const p = product as Product;
  const adultPriceUsd = p.adult_price_usd ?? 0;
  const isCarHire = p.product_type === "car_hire";
  const isTransport = p.product_type === "transport";
  // Falls back to English until the Indonesian translation is
  // approved (src/components/admin/ProductTranslationReview.tsx) --
  // covers all three layout branches below, including Car Hire/
  // Transport, whose booking *forms* stay English but whose title/
  // description here are just display text.
  const displayTitle = locale === "id" && p.translation_status === "approved" && p.title_id ? p.title_id : p.title;
  const displayDescription =
    locale === "id" && p.translation_status === "approved" && p.description_id ? p.description_id : p.description;
  // Keeps the date picker itself from ever offering a date the server
  // would reject -- see src/lib/products/leadTime.ts.
  const minDate = earliestBookableDate(p.min_lead_hours);

  let carTypes: CarType[] = [];
  let carPackages: CarPackage[] = [];
  let carPrices: CarPackagePrice[] = [];
  let transportVehicleTypes: TransportVehicleType[] = [];
  let transportPrices: TransportPrice[] = [];
  let meetingPoints: MeetingPoint[] = [];

  // Everything below only depends on p.id/p.product_type, never on each
  // other's results, with one exception: car_packages needs the
  // car_types it filters by, and car_package_prices needs the
  // car_packages it filters by (same for transport_prices needing
  // transport_vehicle_types) -- those stay a genuine sequential chain.
  // Running the *independent* branches (meeting points, the pricing
  // chain, and reviews) concurrently instead of one after another cuts
  // several round trips to Supabase down to whichever one is slowest,
  // same Promise.all pattern SiteHeader.tsx already uses for its own
  // two independent lookups.
  async function fetchMeetingPoints(): Promise<MeetingPoint[]> {
    const { data } = await supabase
      .from("meeting_points")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true });
    return (data ?? []) as MeetingPoint[];
  }

  async function fetchCarPricing(): Promise<{
    carTypes: CarType[];
    carPackages: CarPackage[];
    carPrices: CarPackagePrice[];
  }> {
    const { data: carTypesData } = await supabase
      .from("car_types")
      .select("*")
      .eq("product_id", p.id)
      .eq("status", "active")
      .order("name", { ascending: true });
    const fetchedCarTypes = (carTypesData ?? []) as CarType[];
    const carTypeIds = fetchedCarTypes.map((c) => c.id);

    const { data: packagesData } =
      carTypeIds.length > 0
        ? await supabase
            .from("car_packages")
            .select("*")
            .in("car_type_id", carTypeIds)
            .eq("status", "active")
            .order("duration_hours", { ascending: true })
        : { data: [] as CarPackage[] };
    const fetchedCarPackages = (packagesData ?? []) as CarPackage[];
    const packageIds = fetchedCarPackages.map((pkg) => pkg.id);

    const { data: pricesData } =
      packageIds.length > 0
        ? await supabase.from("car_package_prices").select("*").in("car_package_id", packageIds)
        : { data: [] as CarPackagePrice[] };

    return {
      carTypes: fetchedCarTypes,
      carPackages: fetchedCarPackages,
      carPrices: (pricesData ?? []) as CarPackagePrice[],
    };
  }

  async function fetchTransportPricing(): Promise<{
    transportVehicleTypes: TransportVehicleType[];
    transportPrices: TransportPrice[];
  }> {
    const { data: vehicleTypesData } = await supabase
      .from("transport_vehicle_types")
      .select("*")
      .eq("product_id", p.id)
      .eq("status", "active")
      .order("name", { ascending: true });
    const fetchedVehicleTypes = (vehicleTypesData ?? []) as TransportVehicleType[];
    const vehicleTypeIds = fetchedVehicleTypes.map((v) => v.id);

    const { data: transportPricesData } =
      vehicleTypeIds.length > 0
        ? await supabase.from("transport_prices").select("*").in("vehicle_type_id", vehicleTypeIds)
        : { data: [] as TransportPrice[] };

    return {
      transportVehicleTypes: fetchedVehicleTypes,
      transportPrices: (transportPricesData ?? []) as TransportPrice[],
    };
  }

  // Spec §6d: published reviews and the average rating, shown on every
  // product type -- Car Hire and Transport bookings can be reviewed
  // too, not just Tours/Activities.
  async function fetchReviews(): Promise<ProductReviewSummary[]> {
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, title, body, published_at")
      .eq("product_id", p.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    return (data ?? []) as ProductReviewSummary[];
  }

  // "You may also like" -- other active trips of the same type, same
  // reasoning as the homepage's card grid but scoped and capped. Not
  // shown at all once there's nothing else to suggest.
  async function fetchRelated(): Promise<RelatedProduct[]> {
    const { data } = await supabase
      .from("products")
      .select("id, slug, title, title_id, translation_status, cover_image_url, location, product_type, adult_price_usd")
      .eq("status", "active")
      .eq("product_type", p.product_type)
      .neq("id", p.id)
      .order("created_at", { ascending: false })
      .limit(4);
    return (data ?? []) as RelatedProduct[];
  }

  let reviews: ProductReviewSummary[];
  let related: RelatedProduct[];
  if (isCarHire) {
    const [mp, carPricing, reviewsResult, relatedResult] = await Promise.all([
      fetchMeetingPoints(),
      fetchCarPricing(),
      fetchReviews(),
      fetchRelated(),
    ]);
    meetingPoints = mp;
    carTypes = carPricing.carTypes;
    carPackages = carPricing.carPackages;
    carPrices = carPricing.carPrices;
    reviews = reviewsResult;
    related = relatedResult;
  } else if (isTransport) {
    const [mp, transportPricing, reviewsResult, relatedResult] = await Promise.all([
      fetchMeetingPoints(),
      fetchTransportPricing(),
      fetchReviews(),
      fetchRelated(),
    ]);
    meetingPoints = mp;
    transportVehicleTypes = transportPricing.transportVehicleTypes;
    transportPrices = transportPricing.transportPrices;
    reviews = reviewsResult;
    related = relatedResult;
  } else {
    const [reviewsResult, relatedResult] = await Promise.all([fetchReviews(), fetchRelated()]);
    reviews = reviewsResult;
    related = relatedResult;
  }

  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const requestHref = locale === "en" ? `/p/${p.slug}/request` : `/id/p/${p.slug}/request`;
  const giftHref = locale === "en" ? `/p/${p.slug}/gift` : `/id/p/${p.slug}/gift`;

  return (
    <>
      <PageViewTracker path={locale === "en" ? `/p/${slug}` : `/id/p/${slug}`} locale={locale} />
      <SiteHeader locale={locale} />
      <main
        className={`mx-auto max-w-4xl px-6 py-10 ${
          !isCarHire && !isTransport ? "pb-24 md:pb-10" : ""
        }`}
      >
      <div className="mb-4 flex justify-end">
        <LocaleSwitcher locale={locale} basePath={`/p/${p.slug}`} />
      </div>
      <ProductGallery
        images={p.gallery_urls.length > 0 ? p.gallery_urls : p.cover_image_url ? [p.cover_image_url] : []}
        alt={displayTitle}
      />

      {isCarHire ? (
        <CarHireProductSection
          title={displayTitle}
          location={p.location}
          durationLabel={p.duration_label}
          description={displayDescription}
          action={startCarHireCheckoutAction.bind(null, p.id, p.slug)}
          carTypes={carTypes}
          packages={carPackages}
          prices={carPrices}
          meetingPoints={meetingPoints}
          defaultDiscountCode={discountCode}
          minPickupDate={minDate}
          error={error}
          priceLabel={dict.carHirePriceLabel}
          formDict={fullDict.carHireForm}
          locale={locale}
        />
      ) : isTransport ? (
        <TransportProductSection
          title={displayTitle}
          location={p.location}
          durationLabel={p.duration_label}
          description={displayDescription}
          action={startTransportCheckoutAction.bind(null, p.id, p.slug)}
          vehicleTypes={transportVehicleTypes}
          prices={transportPrices}
          meetingPoints={meetingPoints}
          defaultDiscountCode={discountCode}
          minPickupDate={minDate}
          error={error}
          priceLabel={dict.transportPriceLabel}
          formDict={fullDict.transportForm}
          locale={locale}
        />
      ) : (
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            {p.location} {p.duration_label ? `· ${p.duration_label}` : ""}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{displayTitle}</h1>
          {displayDescription && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {displayDescription}
            </p>
          )}
        </div>

        <div id="booking" className="h-fit rounded-2xl border border-sand-deep bg-white p-6">
          <div className="font-serif text-2xl font-bold text-ocean">
            {formatUsd(adultPriceUsd)}{" "}
            <span className="text-sm font-normal text-ink-soft">
              ({formatIdr(usdToIdr(adultPriceUsd))}) {dict.perPerson}
            </span>
          </div>
          <div className="my-4 h-px bg-sand-deep" />

          {error && (
            <p className="mb-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
              {error}
            </p>
          )}

          {!p.is_bookable ? (
            <>
              <p className="text-sm text-ink-soft">{dict.manualConfirmationNotice}</p>
              <form method="GET" action={requestHref} className="mt-4 flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {dict.dateLabel}
                  <input
                    type="date"
                    name="date"
                    required
                    min={minDate}
                    defaultValue={date ?? minDate}
                    className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {dict.travelersLabel}
                  <input
                    type="number"
                    name="pax"
                    min={1}
                    max={20}
                    required
                    defaultValue={pax ?? "2"}
                    className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white"
                >
                  {dict.continueToRequest}
                </button>
              </form>
            </>
          ) : (
            <form action={startCheckoutAction.bind(null, p.id, p.slug)} className="flex flex-col gap-3">
              <input type="hidden" name="locale" value={locale} />
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {dict.dateLabel}
                <input
                  type="date"
                  name="date"
                  required
                  min={minDate}
                  defaultValue={date ?? minDate}
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {dict.travelersLabel}
                <input
                  type="number"
                  name="pax"
                  min={1}
                  required
                  defaultValue={pax ?? "2"}
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {dict.hotelNameLabel}
                <input
                  type="text"
                  name="hotel_name"
                  defaultValue={hotelName ?? ""}
                  placeholder={dict.hotelNamePlaceholder}
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {dict.roomNumberLabel}
                <input
                  type="text"
                  name="room_number"
                  defaultValue={roomNumber ?? ""}
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {dict.discountCodeLabel}
                <input
                  type="text"
                  name="discount_code"
                  defaultValue={discountCode ?? ""}
                  placeholder={dict.discountCodePlaceholder}
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm uppercase"
                  style={{ textTransform: "uppercase" }}
                />
              </label>
              <button
                type="submit"
                className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white"
              >
                {dict.continueToCheckout}
              </button>
            </form>
          )}

          {p.is_bookable && (
            <Link
              href={giftHref}
              className="mt-3 block rounded-lg border border-sand-deep px-4 py-3 text-center text-sm font-semibold text-ink hover:bg-sand"
            >
              {dict.giftThisTrip}
            </Link>
          )}
        </div>
      </div>
      )}

      {(p.highlights.length > 0 ||
        p.itinerary.length > 0 ||
        p.includes.length > 0 ||
        p.excludes.length > 0 ||
        p.trip_notes.length > 0) && (
        <div className="mt-10 flex flex-col gap-8">
          {p.highlights.length > 0 && (
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">{dict.highlightsHeading}</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {p.highlights.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166e73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.itinerary.length > 0 && (
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">{dict.itineraryHeading}</h2>
              <ol className="mt-3 flex flex-col gap-4">
                {p.itinerary.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex flex-shrink-0 flex-col items-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ocean text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                      {i < p.itinerary.length - 1 && <span className="mt-1 w-px flex-1 bg-sand-deep" />}
                    </div>
                    <div className="pb-1">
                      <p className="font-semibold text-ink">{step.title}</p>
                      {step.description && (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(p.includes.length > 0 || p.excludes.length > 0) && (
            <div className="grid gap-6 sm:grid-cols-2">
              {p.includes.length > 0 && (
                <div>
                  <h2 className="font-serif text-xl font-semibold text-ink">{dict.includesHeading}</h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {p.includes.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6e8f45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.excludes.length > 0 && (
                <div>
                  <h2 className="font-serif text-xl font-semibold text-ink">{dict.excludesHeading}</h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {p.excludes.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8471f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {p.trip_notes.length > 0 && (
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">{dict.tripNotesHeading}</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {p.trip_notes.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5854" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5M12 8v.01" />
                    </svg>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ProductReviews reviews={reviews} averageRating={averageRating} locale={locale} />

      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-ink">{dict.relatedHeading}</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <Link
                key={r.id}
                href={locale === "en" ? `/p/${r.slug}` : `/id/p/${r.slug}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-sand-deep bg-white transition hover:shadow-md"
              >
                {r.cover_image_url ? (
                  <div className="relative h-32 w-full">
                    <Image
                      src={r.cover_image_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-sand" />
                )}
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">
                    {PRODUCT_TYPE_LABELS[r.product_type]}
                  </p>
                  <p className="font-serif text-sm font-semibold text-ink">
                    {locale === "id" && r.translation_status === "approved" && r.title_id
                      ? r.title_id
                      : r.title}
                  </p>
                  {r.adult_price_usd != null && (
                    <p className="mt-auto pt-1 text-xs font-semibold text-ocean">
                      {formatUsd(r.adult_price_usd)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      </main>

      {!isCarHire && !isTransport && (
        // min-w-0 on the price side is the actual fix, not decoration:
        // a flex child's default min-width is "auto" (its content's
        // natural width), which on a narrow phone (this bar was
        // overflowing the viewport on a 375px-wide iPhone 6s) can add
        // up to wider than the screen with nothing to shrink -- min-w-0
        // lets it truncate instead of forcing the whole bar, and with
        // it the whole page, wider than the viewport.
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-deep bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-1">
            <div className="min-w-0 truncate font-serif text-base font-bold text-ocean sm:text-lg">
              {formatUsd(adultPriceUsd)}{" "}
              <span className="text-xs font-normal text-ink-soft">{dict.perPerson}</span>
            </div>
            <a
              href="#booking"
              className="flex-shrink-0 whitespace-nowrap rounded-lg bg-coral px-4 py-2.5 text-sm font-semibold text-white"
            >
              {dict.mobileBookingCta}
            </a>
          </div>
        </div>
      )}

      <SiteFooter locale={locale} />
      <SiteCookieNotice locale={locale} />
    </>
  );
}
