import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import type { Product } from "@/lib/products/types";
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
import { CarHireProductSection } from "@/components/CarHireProductSection";
import { TransportProductSection } from "@/components/TransportProductSection";
import { startCheckoutAction, startCarHireCheckoutAction, startTransportCheckoutAction } from "@/app/p/[slug]/actions";
import { earliestBookableDate } from "@/lib/products/leadTime";
import { ProductReviews, type ProductReviewSummary } from "@/components/ProductReviews";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

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

  if (isCarHire || isTransport) {
    const { data: meetingPointsData } = await supabase
      .from("meeting_points")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true });
    meetingPoints = (meetingPointsData ?? []) as MeetingPoint[];

    if (isCarHire) {
      const { data: carTypesData } = await supabase
        .from("car_types")
        .select("*")
        .eq("product_id", p.id)
        .eq("status", "active")
        .order("name", { ascending: true });
      carTypes = (carTypesData ?? []) as CarType[];
      const carTypeIds = carTypes.map((c) => c.id);

      const { data: packagesData } =
        carTypeIds.length > 0
          ? await supabase
              .from("car_packages")
              .select("*")
              .in("car_type_id", carTypeIds)
              .eq("status", "active")
              .order("duration_hours", { ascending: true })
          : { data: [] as CarPackage[] };
      carPackages = (packagesData ?? []) as CarPackage[];
      const packageIds = carPackages.map((pkg) => pkg.id);

      const { data: pricesData } =
        packageIds.length > 0
          ? await supabase.from("car_package_prices").select("*").in("car_package_id", packageIds)
          : { data: [] as CarPackagePrice[] };
      carPrices = (pricesData ?? []) as CarPackagePrice[];
    } else {
      const { data: vehicleTypesData } = await supabase
        .from("transport_vehicle_types")
        .select("*")
        .eq("product_id", p.id)
        .eq("status", "active")
        .order("name", { ascending: true });
      transportVehicleTypes = (vehicleTypesData ?? []) as TransportVehicleType[];
      const vehicleTypeIds = transportVehicleTypes.map((v) => v.id);

      const { data: transportPricesData } =
        vehicleTypeIds.length > 0
          ? await supabase.from("transport_prices").select("*").in("vehicle_type_id", vehicleTypeIds)
          : { data: [] as TransportPrice[] };
      transportPrices = (transportPricesData ?? []) as TransportPrice[];
    }
  }

  // Spec §6d: published reviews and the average rating, shown on every
  // product type -- Car Hire and Transport bookings can be reviewed
  // too, not just Tours/Activities.
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select("id, rating, title, body, published_at")
    .eq("product_id", p.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const reviews = (reviewsData ?? []) as ProductReviewSummary[];
  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const requestHref = locale === "en" ? `/p/${p.slug}/request` : `/id/p/${p.slug}/request`;
  const giftHref = locale === "en" ? `/p/${p.slug}/gift` : `/id/p/${p.slug}/gift`;

  return (
    <>
      <PageViewTracker path={locale === "en" ? `/p/${slug}` : `/id/p/${slug}`} locale={locale} />
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-4 flex justify-end">
        <LocaleSwitcher locale={locale} basePath={`/p/${p.slug}`} />
      </div>
      {p.cover_image_url && (
        // This is the product page's LCP element (the big above-the-fold
        // hero photo), so preload=true tells the browser to start
        // fetching it from the <head> instead of discovering it later.
        <div className="relative mb-6 h-72 w-full overflow-hidden rounded-2xl">
          <Image
            src={p.cover_image_url}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 896px"
            preload
            className="object-cover"
          />
        </div>
      )}

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

        <div className="h-fit rounded-2xl border border-sand-deep bg-white p-6">
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

      <ProductReviews reviews={reviews} averageRating={averageRating} locale={locale} />
      </main>
      <SiteFooter locale={locale} />
      <SiteCookieNotice locale={locale} />
    </>
  );
}
