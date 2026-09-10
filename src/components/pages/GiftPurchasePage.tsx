import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import type { Product } from "@/lib/products/types";
import { SiteHeader } from "@/components/SiteHeader";
import { PageViewTracker } from "@/components/PageViewTracker";
import { startGiftCheckoutAction } from "@/app/p/[slug]/gift/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

/**
 * Shared by src/app/p/[slug]/gift/page.tsx (English) and
 * src/app/id/p/[slug]/gift/page.tsx (Indonesian), same pattern as the
 * other translated pages.
 */
export async function GiftPurchasePage({
  params,
  searchParams,
  locale,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    pax?: string;
    recipient_name?: string;
    recipient_email?: string;
    discount_code?: string;
    error?: string;
  }>;
  locale: Locale;
}) {
  const dict = getDictionary(locale).gift;
  const { slug } = await params;
  const {
    pax,
    recipient_name: recipientName,
    recipient_email: recipientEmail,
    discount_code: discountCode,
    error,
  } = await searchParams;
  const pathPrefix = locale === "id" ? "/id" : "";

  await requireCustomer(`${pathPrefix}/p/${slug}/gift`);

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
  if (!p.is_bookable || p.adult_price_usd == null) {
    notFound(); // gifting mirrors instant-checkout eligibility -- manual-confirmation trips aren't paid for online yet
  }

  const paxCount = Math.min(20, Math.max(1, Number(pax) || 2));
  const totalUsd = p.adult_price_usd * paxCount;

  return (
    <>
      <PageViewTracker path={`${pathPrefix}/p/${slug}/gift`} locale={locale} />
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{p.title}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">{dict.heading}</h1>
        <p className="mt-2 text-sm text-ink-soft">{dict.intro}</p>

        {error && (
          <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
            {error}
          </p>
        )}

        <form
          action={startGiftCheckoutAction.bind(null, p.id, p.slug)}
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-sand-deep bg-white p-6"
        >
          <input type="hidden" name="locale" value={locale} />
          <div>
            <label className={labelClass} htmlFor="recipient_name">
              {dict.recipientNameLabel}
            </label>
            <input
              id="recipient_name"
              name="recipient_name"
              required
              defaultValue={recipientName ?? ""}
              placeholder={dict.recipientNamePlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="recipient_email">
              {dict.recipientContactLabel}
            </label>
            <input
              id="recipient_email"
              name="recipient_email"
              required
              defaultValue={recipientEmail ?? ""}
              placeholder={dict.recipientContactPlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="pax">
              {dict.travelersLabel}
            </label>
            <input
              id="pax"
              name="pax"
              type="number"
              min={1}
              max={20}
              required
              defaultValue={paxCount}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="discount_code">
              {dict.discountCodeLabel}
            </label>
            <input
              id="discount_code"
              name="discount_code"
              defaultValue={discountCode ?? ""}
              placeholder={dict.discountCodePlaceholder}
              className={inputClass}
              style={{ textTransform: "uppercase" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-sand-deep pt-4">
            <span className="text-sm text-ink-soft">{dict.totalLabel}</span>
            <span className="font-serif text-xl font-bold text-ocean">
              {formatUsd(totalUsd)} <span className="text-sm font-normal">({formatIdr(usdToIdr(totalUsd))})</span>
            </span>
          </div>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white"
          >
            {dict.continueToPayment}
          </button>
        </form>
      </main>
    </>
  );
}
