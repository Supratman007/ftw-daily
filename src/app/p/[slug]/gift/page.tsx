import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import type { Product } from "@/lib/products/types";
import { SiteHeader } from "@/components/SiteHeader";
import { startGiftCheckoutAction } from "./actions";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

/**
 * Standalone "buy this trip as a gift" (previously the only way a
 * voucher ever existed was as a side effect of cancelling an existing
 * booking). No date is picked here -- that's the recipient's call, made
 * later at /redeem once they're ready -- so this is really just "pay
 * for N travelers' worth of this trip, get a voucher code to give
 * away," reusing the same Xendit hosted-invoice flow as a normal
 * booking. Login required up front (not just in the action) for the
 * same reason as the booking-request form: losing a filled-out
 * recipient name/email to a login detour is a worse experience than
 * asking before they've typed anything.
 */
export default async function GiftPurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    pax?: string;
    recipient_name?: string;
    recipient_email?: string;
    discount_code?: string;
    error?: string;
  }>;
}) {
  const { slug } = await params;
  const {
    pax,
    recipient_name: recipientName,
    recipient_email: recipientEmail,
    discount_code: discountCode,
    error,
  } = await searchParams;

  await requireCustomer(`/p/${slug}/gift`);

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
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{p.title}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">Give this trip as a gift</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Pay now, and we&apos;ll send you a voucher code to pass along. The recipient picks their
          own date later -- no rush, no date to lock in today.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
            {error}
          </p>
        )}

        <form
          action={startGiftCheckoutAction.bind(null, p.id, p.slug)}
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-sand-deep bg-white p-6"
        >
          <div>
            <label className={labelClass} htmlFor="recipient_name">
              Recipient&apos;s name
            </label>
            <input
              id="recipient_name"
              name="recipient_name"
              required
              defaultValue={recipientName ?? ""}
              placeholder="Who's this for?"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="recipient_email">
              Recipient&apos;s email or phone
            </label>
            <input
              id="recipient_email"
              name="recipient_email"
              required
              defaultValue={recipientEmail ?? ""}
              placeholder="How we'd reach them if needed -- we won't contact them unprompted"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="pax">
              Number of travelers
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
              Discount code (optional)
            </label>
            <input
              id="discount_code"
              name="discount_code"
              defaultValue={discountCode ?? ""}
              placeholder="e.g. WELCOME10"
              className={inputClass}
              style={{ textTransform: "uppercase" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-sand-deep pt-4">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="font-serif text-xl font-bold text-ocean">
              {formatUsd(totalUsd)} <span className="text-sm font-normal">({formatIdr(usdToIdr(totalUsd))})</span>
            </span>
          </div>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white"
          >
            Continue to payment
          </button>
        </form>
      </main>
    </>
  );
}
