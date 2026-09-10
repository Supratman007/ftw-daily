import Link from "next/link";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { formatIdr } from "@/lib/currency";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { SiteHeader } from "@/components/SiteHeader";
import { PageViewTracker } from "@/components/PageViewTracker";
import { submitRedemptionRequestAction } from "@/app/redeem/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const cardClass = "mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm";

type VoucherRow = {
  id: string;
  value_amount_idr: number;
  recipient_name: string;
  redemption_code: string;
  status: "issued" | "redeemed" | "expired";
  expires_at: string;
  redemption_requested_at: string | null;
  requested_slot_date: string | null;
  requested_pax_count: number | null;
  products: { title: string } | null;
  bookings: { pax_count: number } | null;
};

/**
 * Shared by src/app/redeem/page.tsx (English) and
 * src/app/id/redeem/page.tsx (Indonesian). Public, unauthenticated --
 * see the original page comment (now here) for why. The mailto
 * support-email links stay literal (never translated), same reasoning
 * as SUPPORT_EMAIL not changing by locale.
 */
export async function RedeemPage({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ code?: string; submitted?: string; error?: string }>;
  locale: Locale;
}) {
  const dict = getDictionary(locale).redeem;
  const { code, submitted, error } = await searchParams;
  const homeHref = locale === "en" ? "/" : "/id";
  const redeemPath = locale === "en" ? "/redeem" : "/id/redeem";

  if (!code) {
    return (
      <>
        <PageViewTracker path={redeemPath} locale={locale} />
        <SiteHeader locale={locale} />
        <main className="mx-auto max-w-md px-6 py-10">
          <h1 className="font-serif text-2xl font-semibold text-ink">{dict.heading}</h1>
          <p className="mt-2 text-sm text-ink-soft">{dict.intro}</p>
          {error && (
            <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
              {error}
            </p>
          )}
          <form action={locale === "en" ? "/redeem" : "/id/redeem"} method="GET" className="mt-6 flex flex-col gap-3">
            <div>
              <label className={labelClass} htmlFor="code">
                {dict.codeLabel}
              </label>
              <input id="code" name="code" required placeholder={dict.codePlaceholder} className={inputClass} />
            </div>
            <button
              type="submit"
              className="self-start rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-white"
            >
              {dict.lookupButton}
            </button>
          </form>
        </main>
      </>
    );
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data } = await serviceClient
    .from("gift_vouchers")
    .select(
      "id, value_amount_idr, recipient_name, redemption_code, status, expires_at, redemption_requested_at, requested_slot_date, requested_pax_count, products(title), bookings!original_booking_id(pax_count)"
    )
    .eq("redemption_code", code.trim().toUpperCase())
    .maybeSingle();
  const voucher = data as unknown as VoucherRow | null;

  if (!voucher) {
    return (
      <>
        <PageViewTracker path={redeemPath} locale={locale} />
        <SiteHeader locale={locale} />
        <main className="mx-auto max-w-md px-6 py-10">
          <h1 className="font-serif text-2xl font-semibold text-ink">{dict.notFoundHeading}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {dict.notFoundBody(code)}{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            {dict.notFoundBodyEnd}
          </p>
        </main>
      </>
    );
  }

  const isExpired = voucher.status === "expired" || new Date(voucher.expires_at) < new Date();
  const isRedeemed = voucher.status === "redeemed";
  const hasPendingRequest = !isRedeemed && Boolean(voucher.redemption_requested_at);
  const productTitle = voucher.products?.title ?? "your trip";

  return (
    <>
      <PageViewTracker path={redeemPath} locale={locale} />
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-md px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          {voucher.redemption_code}
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">{dict.voucherHeading}</h1>

        <div className={cardClass}>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{dict.tripLabel}</dt>
              <dd className="text-ink">{productTitle}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{dict.forLabel}</dt>
              <dd className="text-ink">{voucher.recipient_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{dict.valueLabel}</dt>
              <dd className="font-semibold text-ink">{formatIdr(voucher.value_amount_idr)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{dict.expiresLabel}</dt>
              <dd className="text-ink">{new Date(voucher.expires_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {submitted === "1" && (
          <div className={cardClass}>
            <p className="font-semibold text-ink">{dict.requestSentHeading}</p>
            <p className="mt-2 text-ink-soft">{dict.requestSentBody}</p>
          </div>
        )}

        {submitted !== "1" && isRedeemed && (
          <div className={cardClass}>
            <p className="font-semibold text-ink">{dict.alreadyRedeemedHeading}</p>
            <p className="mt-2 text-ink-soft">
              {dict.alreadyRedeemedBody}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        )}

        {submitted !== "1" && !isRedeemed && isExpired && (
          <div className={cardClass}>
            <p className="font-semibold text-coral-dark">{dict.expiredHeading}</p>
            <p className="mt-2 text-ink-soft">
              {dict.expiredBody}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              {dict.expiredBodyEnd}
            </p>
          </div>
        )}

        {submitted !== "1" && !isRedeemed && !isExpired && hasPendingRequest && (
          <div className={cardClass}>
            <p className="font-semibold text-ink">{dict.pendingRequestHeading}</p>
            <p className="mt-2 text-ink-soft">
              {dict.pendingRequestPrefix(voucher.requested_slot_date, voucher.requested_pax_count)}{" "}
              {dict.pendingRequestSuffix}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        )}

        {submitted !== "1" && !isRedeemed && !isExpired && !hasPendingRequest && (
          <div className={cardClass}>
            <p className="font-semibold text-ink">{dict.readyHeading}</p>
            <p className="mt-1 text-ink-soft">{dict.readyBody}</p>
            {error && (
              <p className="mt-3 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-coral-dark">
                {error}
              </p>
            )}
            <form
              action={submitRedemptionRequestAction.bind(null, voucher.redemption_code)}
              className="mt-4 flex flex-col gap-3"
            >
              <input type="hidden" name="locale" value={locale} />
              <div>
                <label className={labelClass} htmlFor="name">
                  {dict.yourNameLabel}
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  defaultValue={voucher.recipient_name}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="email">
                  {dict.yourEmailLabel}
                </label>
                <input id="email" name="email" type="email" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">
                  {dict.yourPhoneLabel}
                </label>
                <input id="phone" name="phone" type="tel" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="preferred_slot_date">
                  {dict.preferredDateLabel}
                </label>
                <input
                  id="preferred_slot_date"
                  name="preferred_slot_date"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pax_count">
                  {dict.travelersLabel}
                </label>
                <input
                  id="pax_count"
                  name="pax_count"
                  type="number"
                  min={1}
                  max={20}
                  required
                  defaultValue={voucher.requested_pax_count ?? voucher.bookings?.pax_count ?? 1}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="message">
                  {dict.messageLabel}
                </label>
                <textarea id="message" name="message" rows={3} className={inputClass} />
              </div>
              <button
                type="submit"
                className="self-start rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-white"
              >
                {dict.submit}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-xs text-ink-soft">
          {dict.questionsNotice}{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <Link href={homeHref} className="mt-2 inline-block text-xs text-ink-soft hover:underline">
          {dict.backToSite}
        </Link>
      </main>
    </>
  );
}
