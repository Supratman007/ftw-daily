import Link from "next/link";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { formatIdr } from "@/lib/currency";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { SiteHeader } from "@/components/SiteHeader";
import { submitRedemptionRequestAction } from "./actions";

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
 * Public redemption entry point for a gift voucher (spec §6f follow-up)
 * -- the recipient was never a customer, has no account, and has no
 * booking page to check, so this has to work with nothing but the
 * voucher code from the email. No login required, by design. Looks the
 * voucher up with the service-role client, same "unauthenticated,
 * code-based access" pattern as the agent bank-change confirmation
 * flow -- there's no RLS policy that could let an anonymous visitor
 * read gift_vouchers directly, nor should there be one (that would let
 * anyone enumerate every voucher in the table).
 */
export default async function RedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; submitted?: string; error?: string }>;
}) {
  const { code, submitted, error } = await searchParams;

  if (!code) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md px-6 py-10">
          <h1 className="font-serif text-2xl font-semibold text-ink">Redeem a gift voucher</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Enter the voucher code from your email to get started.
          </p>
          {error && (
            <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
              {error}
            </p>
          )}
          <form action="/redeem" method="GET" className="mt-6 flex flex-col gap-3">
            <div>
              <label className={labelClass} htmlFor="code">
                Voucher code
              </label>
              <input
                id="code"
                name="code"
                required
                placeholder="e.g. GIFT-CQPEBR"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="self-start rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-white"
            >
              Look up voucher
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
        <SiteHeader />
        <main className="mx-auto max-w-md px-6 py-10">
          <h1 className="font-serif text-2xl font-semibold text-ink">Voucher not found</h1>
          <p className="mt-2 text-sm text-ink-soft">
            We couldn&apos;t find a voucher with code &quot;{code}&quot;. Double-check it against
            your email, or email us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            and we&apos;ll help.
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
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          {voucher.redemption_code}
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">Gift voucher</h1>

        <div className={cardClass}>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Trip</dt>
              <dd className="text-ink">{productTitle}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">For</dt>
              <dd className="text-ink">{voucher.recipient_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Value</dt>
              <dd className="font-semibold text-ink">{formatIdr(voucher.value_amount_idr)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Expires</dt>
              <dd className="text-ink">{new Date(voucher.expires_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {submitted === "1" && (
          <div className={cardClass}>
            <p className="font-semibold text-ink">Request sent!</p>
            <p className="mt-2 text-ink-soft">
              We&apos;ve received your redemption request and emailed you a confirmation.
              We&apos;ll be in touch shortly to confirm your date.
            </p>
          </div>
        )}

        {submitted !== "1" && isRedeemed && (
          <div className={cardClass}>
            <p className="font-semibold text-ink">Already redeemed</p>
            <p className="mt-2 text-ink-soft">
              This voucher has already been redeemed. If that&apos;s unexpected, email us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        )}

        {submitted !== "1" && !isRedeemed && isExpired && (
          <div className={cardClass}>
            <p className="font-semibold text-coral-dark">This voucher has expired</p>
            <p className="mt-2 text-ink-soft">
              Reach out to us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              -- we may still be able to help.
            </p>
          </div>
        )}

        {submitted !== "1" && !isRedeemed && !isExpired && hasPendingRequest && (
          <div className={cardClass}>
            <p className="font-semibold text-ink">Request already submitted</p>
            <p className="mt-2 text-ink-soft">
              We already have a redemption request on file for this voucher
              {voucher.requested_slot_date && ` for ${voucher.requested_slot_date}`}
              {voucher.requested_pax_count &&
                ` (${voucher.requested_pax_count} traveler${voucher.requested_pax_count === 1 ? "" : "s"})`}{" "}
              -- we&apos;ll be in touch soon. Need to change something? Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        )}

        {submitted !== "1" && !isRedeemed && !isExpired && !hasPendingRequest && (
          <div className={cardClass}>
            <p className="font-semibold text-ink">Ready to book?</p>
            <p className="mt-1 text-ink-soft">
              Tell us who you are and when you&apos;d like to go -- we&apos;ll confirm your date
              and take it from there.
            </p>
            {error && (
              <p className="mt-3 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-coral-dark">
                {error}
              </p>
            )}
            <form
              action={submitRedemptionRequestAction.bind(null, voucher.redemption_code)}
              className="mt-4 flex flex-col gap-3"
            >
              <div>
                <label className={labelClass} htmlFor="name">
                  Your name
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
                  Your email
                </label>
                <input id="email" name="email" type="email" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">
                  Your phone (optional)
                </label>
                <input id="phone" name="phone" type="tel" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="preferred_slot_date">
                  Preferred date
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
                  Number of travelers
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
                  Anything else we should know? (optional)
                </label>
                <textarea id="message" name="message" rows={3} className={inputClass} />
              </div>
              <button
                type="submit"
                className="self-start rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-white"
              >
                Submit request
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-xs text-ink-soft">
          Questions about this voucher?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <Link href="/" className="mt-2 inline-block text-xs text-ink-soft hover:underline">
          ← Back to Adventure Lombok Booking
        </Link>
      </main>
    </>
  );
}
