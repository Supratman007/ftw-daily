import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import { PARK_INSURANCE_FEE_IDR } from "@/lib/bookings/types";
import type { Product } from "@/lib/products/types";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { submitBookingRequestAction } from "@/app/p/[slug]/request/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";

/**
 * Shared by src/app/p/[slug]/request/page.tsx (English) and
 * src/app/id/p/[slug]/request/page.tsx (Indonesian) -- the manual-
 * confirmation request form (spec §6b), same "one implementation, two
 * thin route entrypoints" pattern as the other translated pages.
 */
export async function RequestPage({
  params,
  searchParams,
  locale,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; pax?: string; error?: string }>;
  locale: Locale;
}) {
  const dict = getDictionary(locale).request;
  const { slug } = await params;
  const { date, pax: paxRaw, error } = await searchParams;
  const pax = Math.min(20, Math.max(1, Number(paxRaw) || 1));
  const pathPrefix = locale === "id" ? "/id" : "";

  await requireCustomer(
    `${pathPrefix}/p/${slug}/request?date=${encodeURIComponent(date ?? "")}&pax=${pax}`
  );

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
  if (p.is_bookable) {
    notFound(); // this form only applies to manual-confirmation products
  }

  const adultPriceUsd = p.adult_price_usd ?? 0;
  const subtotalUsd = adultPriceUsd * pax;
  const estimate = `${formatUsd(subtotalUsd)} (${formatIdr(usdToIdr(subtotalUsd))})`;

  return (
    <>
      <PageViewTracker path={`${pathPrefix}/p/${slug}/request`} locale={locale} />
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{p.title}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">{dict.heading}</h1>
        <p className="mt-2 text-sm text-ink-soft">{dict.summary(date ?? "", pax, estimate)}</p>

        {error && (
          <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
            {error}
          </p>
        )}

        <form
          action={submitBookingRequestAction.bind(null, p.id, p.slug, date ?? "", pax)}
          encType="multipart/form-data"
          className="mt-6 flex flex-col gap-8"
        >
          <input type="hidden" name="locale" value={locale} />
          {Array.from({ length: pax }).map((_, i) => (
            <fieldset key={i} className="rounded-2xl border border-sand-deep bg-white p-5">
              <legend className="px-1 font-serif text-lg font-semibold text-ink">
                {dict.travelerLegend(i + 1)}
              </legend>

              <div className="mt-2">
                <label className={labelClass} htmlFor={`traveler_name_${i}`}>
                  {dict.fullNameLabel}
                </label>
                <input
                  id={`traveler_name_${i}`}
                  name={`traveler_name_${i}`}
                  required
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label className={labelClass} htmlFor={`passport_${i}`}>
                  {dict.passportLabel}
                </label>
                <input
                  id={`passport_${i}`}
                  name={`passport_${i}`}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  required
                  className="mt-1 block w-full text-sm text-ink-soft"
                />
                <p className="mt-1 text-xs text-ink-soft">{dict.passportHint}</p>
              </div>

              <div className="mt-4">
                <p className={labelClass}>{dict.insuranceLabel}</p>
                <label className="mt-2 flex items-start gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={`insurance_type_${i}`}
                    value="self_provided"
                    defaultChecked
                    required
                    className="mt-1"
                  />
                  {dict.selfInsuranceLabel}
                </label>
                <div className="ml-6 mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name={`insurance_number_${i}`}
                    placeholder={dict.policyNumberPlaceholder}
                    className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    name={`insurance_company_${i}`}
                    placeholder={dict.insuranceCompanyPlaceholder}
                    className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
                  />
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={`insurance_type_${i}`}
                    value="park_provided"
                    className="mt-1"
                  />
                  {dict.parkInsuranceLabel(formatIdr(PARK_INSURANCE_FEE_IDR))}
                </label>
              </div>
            </fieldset>
          ))}

          <div className="rounded-2xl border border-sand-deep bg-white p-5">
            <label className={labelClass} htmlFor="hotel_name">
              {dict.hotelNameLabel}
            </label>
            <input id="hotel_name" name="hotel_name" className={inputClass} />
            <label className={`${labelClass} mt-4 block`} htmlFor="room_number">
              {dict.roomNumberLabel}
            </label>
            <input id="room_number" name="room_number" className={inputClass} />
          </div>

          <button
            type="submit"
            className="self-start rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
          >
            {dict.submit}
          </button>
          <p className="text-xs text-ink-soft">{dict.notice}</p>
        </form>
      </main>
      <SiteFooter locale={locale} />
      <SiteCookieNotice locale={locale} />
    </>
  );
}
