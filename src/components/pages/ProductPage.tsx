import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCardImage } from "@/components/ProductCardImage";
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
  //
  // displayDescription is rich-text HTML (from RichTextEditor in the
  // admin, saved through sanitizeDescriptionHtml.ts) -- rendered below
  // with dangerouslySetInnerHTML, safe because it was already run
  // through that allowlist sanitizer on the way into the database, not
  // because it's trusted here. Never pass raw admin input straight to
  // dangerouslySetInnerHTML without that step happening first.
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

  // "Trip essentials" -- a GetYourGuide-style quick-facts panel (icon +
  // bold title + one-line description, in a 2-column grid), the piece
  // the earlier icon-square pass on Highlights/Includes/Trip notes
  // further down the page didn't actually cover -- that upgraded
  // existing single-line bullet lists, this is a new summary block.
  // Sits in the LEFT column, ABOVE the description ("About this tour"),
  // running alongside the floating booking card on the right -- not as
  // its own full-width band between the gallery and this section, and
  // not below the description either. Built as a plain value here and
  // dropped into each layout branch's left column below, before the
  // description paragraph. Only ever shows facts that are genuinely
  // true for THIS product from real fields already on it (duration, capacity, instant vs.
  // manual confirmation, whether it's giftable) -- never a generic
  // claim like GYG's own "Reserve now & pay later" or a named tour
  // guide language we have no per-product data for. Hotel pickup is
  // skipped for Car Hire/Transport, which already have their own
  // detailed pickup picker right in the booking form.
  const tripEssentialsPanel = (() => {
    const facts: Array<{ icon: React.ReactNode; bg: string; fg: string; title: string; desc: string }> = [];
    if (p.duration_label) {
      facts.push({
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        ),
        bg: "bg-teal-light",
        fg: "text-teal",
        title: dict.durationFactTitle,
        desc: p.duration_label,
      });
    }
    if (p.capacity_per_date) {
      facts.push({
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15.5 14.3c2.4.5 4.2 2.5 4.2 5.7" />
          </svg>
        ),
        bg: "bg-[#eaf1e1]",
        fg: "text-rice",
        title: dict.groupSizeFactTitle,
        desc: dict.groupSizeFactDesc(p.capacity_per_date),
      });
    }
    facts.push(
      p.is_bookable
        ? {
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            ),
            bg: "bg-teal-light",
            fg: "text-teal",
            title: dict.instantConfirmFactTitle,
            desc: dict.instantConfirmFactDesc,
          }
        : {
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
            ),
            bg: "bg-sand",
            fg: "text-ink-soft",
            title: dict.manualConfirmFactTitle,
            desc: dict.manualConfirmFactDesc,
          }
    );
    if (!isCarHire && !isTransport) {
      facts.push({
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        ),
        bg: "bg-[#eaf1e1]",
        fg: "text-rice",
        title: dict.pickupFactTitle,
        desc: dict.pickupFactDesc,
      });
    }
    if (p.is_bookable) {
      facts.push({
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="9" width="18" height="12" rx="1.5" />
            <path d="M3 9V7a2 2 0 012-2h2m14 4V7a2 2 0 00-2-2h-2M12 5v16M8 5a2 2 0 110-4c1.5 0 4 2 4 4M16 5a2 2 0 100-4c-1.5 0-4 2-4 4" />
          </svg>
        ),
        bg: "bg-[#fce6dd]",
        fg: "text-coral-dark",
        title: dict.giftFactTitle,
        desc: dict.giftFactDesc,
      });
    }
    if (facts.length === 0) return null;
    return (
      <div className="rounded-2xl border border-sand-deep bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-ink">{dict.tripEssentialsHeading}</h2>
        <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {facts.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${f.bg} ${f.fg}`}>
                {f.icon}
              </span>
              <div className="pt-1">
                <p className="text-sm font-semibold text-ink">{f.title}</p>
                <p className="text-xs text-ink-soft">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  })();

  return (
    <>
      <PageViewTracker path={locale === "en" ? `/p/${slug}` : `/id/p/${slug}`} locale={locale} />
      <SiteHeader locale={locale} localeSwitcherBasePath={`/p/${p.slug}`} />
      <main
        className={`mx-auto max-w-4xl px-6 py-10 ${
          !isCarHire && !isTransport ? "pb-24 md:pb-10" : ""
        }`}
      >
      {/* Title + location/duration line, above the photo gallery --
          GetYourGuide-style page order (title first, then the photo,
          then the quick-facts strip, then the description/booking
          section), per the user's request. Used to live inside each
          of the three booking-layout branches below (default tour,
          Car Hire, Transport) since each one wanted it in the same
          spot; pulled up here once so it only renders once and always
          sits above the photo no matter which product type this is. */}
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        {p.location} {p.duration_label ? `· ${p.duration_label}` : ""}
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{displayTitle}</h1>

      <div className="mt-4">
        <ProductGallery
          images={p.gallery_urls.length > 0 ? p.gallery_urls : p.cover_image_url ? [p.cover_image_url] : []}
          alt={displayTitle}
        />
      </div>

      {isCarHire ? (
        <CarHireProductSection
          title={displayTitle}
          description={displayDescription}
          essentialsPanel={tripEssentialsPanel}
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
          description={displayDescription}
          essentialsPanel={tripEssentialsPanel}
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
          {tripEssentialsPanel}
          {displayDescription && (
            <div
              className={`rich-content break-words text-sm text-ink-soft ${tripEssentialsPanel ? "mt-6" : ""}`}
              dangerouslySetInnerHTML={{ __html: displayDescription }}
            />
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
                  className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
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
                className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
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
              <ul className="mt-3 flex flex-col gap-3">
                {p.highlights.map((line, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-light text-teal">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </span>
                    <span className="pt-2 leading-relaxed">{line}</span>
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
                    {/* min-w-0: this div is a row-flex item (sibling
                        of the numbered-circle column above) -- without
                        it, a flex item's default automatic minimum
                        width is its content's min-content size, so a
                        long unbroken word/URL in the description would
                        force this column (and the whole row) wider
                        than the page instead of wrapping. */}
                    <div className="min-w-0 pb-1">
                      <p className="font-semibold text-ink">{step.title}</p>
                      {step.description && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
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
                  <ul className="mt-3 flex flex-col gap-3">
                    {p.includes.map((line, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#eaf1e1] text-rice">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                        </span>
                        <span className="pt-2 leading-relaxed">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.excludes.length > 0 && (
                <div>
                  <h2 className="font-serif text-xl font-semibold text-ink">{dict.excludesHeading}</h2>
                  <ul className="mt-3 flex flex-col gap-3">
                    {p.excludes.map((line, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#fce6dd] text-coral-dark">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </span>
                        <span className="pt-2 leading-relaxed">{line}</span>
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
              <ul className="mt-3 flex flex-col gap-3">
                {p.trip_notes.map((line, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-sand text-ink-soft">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11v5M12 8v.01" />
                      </svg>
                    </span>
                    <span className="pt-2 leading-relaxed">{line}</span>
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
          {/* A swipeable horizontal strip on phones (each card sized to
              peek the next one, same overflow-x-auto pattern as the
              photo galleries above) instead of one long vertical stack
              -- shorter page, and a much more familiar "browse more
              trips" gesture on mobile. Reverts to the plain grid from
              sm: up, where there's room to just show them all. */}
          <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
            {related.map((r) => (
              <Link
                key={r.id}
                href={locale === "en" ? `/p/${r.slug}` : `/id/p/${r.slug}`}
                className="flex w-[70%] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-sand-deep bg-white transition hover:shadow-md sm:w-auto sm:flex-shrink"
              >
                <ProductCardImage
                  src={r.cover_image_url}
                  alt=""
                  sizes="(max-width: 640px) 70vw, 25vw"
                  comingSoonLabel={dict.photoComingSoon}
                  className="h-32"
                />
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
              className="flex-shrink-0 whitespace-nowrap rounded-lg bg-coral px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
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
