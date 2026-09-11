import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { formatIdr } from "@/lib/currency";
import { customerLogoutAction } from "@/app/actions";
import { PageViewTracker } from "@/components/PageViewTracker";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

interface VoucherRow {
  id: string;
  redemption_code: string;
  value_amount_idr: number;
  recipient_name: string;
  status: "pending_payment" | "issued" | "redeemed" | "expired";
  expires_at: string;
  product_id: string;
}

/**
 * Shared by src/app/gift/confirmation/[voucherId]/page.tsx (English)
 * and src/app/id/gift/confirmation/[voucherId]/page.tsx (Indonesian).
 * Where Xendit's success_redirect_url sends the purchaser right after
 * they pay for a gift voucher -- startGiftCheckoutAction picks the
 * /id-prefixed version when the purchase was made in Indonesian (see
 * its `locale` hidden field). Same "webhook can land a few seconds
 * after this redirect" shape as /confirmation/[bookingId].
 */
export async function GiftConfirmationPage({
  params,
  locale,
}: {
  params: Promise<{ voucherId: string }>;
  locale: Locale;
}) {
  const dict = getDictionary(locale).giftConfirmation;
  const { voucherId } = await params;
  const pathPrefix = locale === "id" ? "/id" : "";
  const customer = await requireCustomer(`${pathPrefix}/gift/confirmation/${voucherId}`);

  const supabase = await createSupabaseServerClient();
  const { data: voucher } = await supabase
    .from("gift_vouchers")
    .select("id, redemption_code, value_amount_idr, recipient_name, status, expires_at, product_id")
    .eq("id", voucherId)
    .eq("purchaser_customer_id", customer.id)
    .maybeSingle();

  if (!voucher) {
    // Same "wrong account vs. doesn't exist" distinction as the normal
    // booking confirmation page -- see that file for the full reasoning.
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: anyVoucher } = await serviceClient
      .from("gift_vouchers")
      .select("id")
      .eq("id", voucherId)
      .maybeSingle();

    if (anyVoucher) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            {dict.wrongAccountTitle}
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-coral-dark">
            {dict.wrongAccountHeading(customer.email)}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">{dict.wrongAccountBody(customer.email)}</p>
          <form action={customerLogoutAction.bind(null, locale)} className="mt-6">
            <button type="submit" className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark">
              {dict.logout}
            </button>
          </form>
        </main>
      );
    }

    notFound();
  }
  const v = voucher as VoucherRow;

  const { data: product } = await supabase
    .from("products")
    .select("title, slug")
    .eq("id", v.product_id)
    .maybeSingle();

  if (v.status === "pending_payment") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <meta httpEquiv="refresh" content="4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{dict.label}</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-ocean">{dict.confirmingHeading}</h1>
        <p className="mt-2 text-sm text-ink-soft">{dict.confirmingBody}</p>
      </main>
    );
  }

  if (v.status === "expired") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="mt-2 font-serif text-2xl font-semibold text-coral-dark">{dict.failedHeading}</h1>
        <p className="mt-2 text-sm text-ink-soft">{dict.failedBody}</p>
        {product?.slug && (
          <Link
            href={locale === "en" ? `/p/${product.slug}/gift` : `/id/p/${product.slug}/gift`}
            className="mt-6 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
          >
            {dict.backToTrip}
          </Link>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <PageViewTracker path={`${pathPrefix}/gift/confirmation/[voucherId]`} locale={locale} />
      <p className="font-mono text-xs uppercase tracking-widest text-teal">{dict.purchasedLabel}</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ocean">
        {product?.title ?? "Your gift"}
      </h1>

      <div className="mt-6 w-full rounded-2xl border border-sand-deep bg-white p-6 text-left text-sm">
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">{dict.voucherCodeLabel}</span>
          <span className="font-mono font-semibold text-ink">{v.redemption_code}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">{dict.forLabel}</span>
          <span className="text-ink">{v.recipient_name}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">{dict.expiresLabel}</span>
          <span className="text-ink">{new Date(v.expires_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-ink-soft">{dict.totalPaidLabel}</span>
          <span className="font-semibold text-ink">{formatIdr(v.value_amount_idr)}</span>
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-soft">{dict.emailNotice(v.recipient_name)}</p>

      <Link
        href={locale === "en" ? "/" : "/id"}
        className="mt-6 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
      >
        {dict.browseMore}
      </Link>
    </main>
  );
}
