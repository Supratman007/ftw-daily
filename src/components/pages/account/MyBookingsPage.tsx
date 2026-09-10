import Link from "next/link";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import type { Booking, BookingStatus } from "@/lib/bookings/types";
import type { GiftVoucher, GiftVoucherStatus } from "@/lib/cancellations/types";
import { requestGiftVoucherRefundAction } from "@/app/account/bookings/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/locales";

type BookingWithProduct = Booking & { products: { title: string; slug: string } | null };
type PurchasedVoucher = GiftVoucher & { products: { title: string } | null };

function BookingRow({
  b,
  pathPrefix,
  statusLabels,
  viewDetails,
}: {
  b: BookingWithProduct;
  pathPrefix: string;
  statusLabels: Record<BookingStatus, string>;
  viewDetails: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-sand-deep px-4 py-3 text-sm first:border-t-0">
      <div>
        <p className="font-semibold text-ink">{b.products?.title ?? "Trip"}</p>
        <p className="text-ink-soft">
          {b.booking_code} · {b.slot_date} · {statusLabels[b.status]}
        </p>
      </div>
      <Link href={`${pathPrefix}/account/booking/${b.id}`} className="font-semibold text-teal hover:underline">
        {viewDetails}
      </Link>
    </div>
  );
}

/** Shared by src/app/account/bookings/page.tsx (English) and
 * src/app/id/account/bookings/page.tsx (Indonesian). Spec §6h My
 * Bookings: "The list view stays lean. Each row shows just the title,
 * booking code, date, and status -- plus one link: 'View details.'"
 * Split into upcoming/past per spec's "upcoming/completed cards," plus
 * an Incomplete section (not in spec, added so a booking that never
 * finished paying doesn't just silently vanish). */
export async function MyBookingsPage({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
  locale: Locale;
}) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const customer = await requireCustomer(`${pathPrefix}/account/bookings`);
  const { notice, error: actionError } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const dict: Dictionary["account"]["bookings"] = getDictionary(locale).account.bookings;
  const statusLabels = getDictionary(locale).account.booking.bookingStatus;

  const [{ data }, { data: giftVoucherData }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, products(title, slug)")
      .eq("customer_id", customer.id)
      .order("slot_date", { ascending: false }),
    // Only vouchers bought directly (spec §6f follow-up) -- one that
    // came from cancelling a booking already shows on that booking's
    // own page instead, so it isn't duplicated here.
    supabase
      .from("gift_vouchers")
      .select("*, products(title)")
      .eq("purchaser_customer_id", customer.id)
      .order("issued_at", { ascending: false }),
  ]);

  const bookings = (data ?? []) as BookingWithProduct[];
  const purchasedVouchers = (giftVoucherData ?? []) as unknown as PurchasedVoucher[];
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = bookings.filter((b) => b.status === "paid_confirmed" && b.slot_date >= today);
  const past = bookings.filter((b) => b.status === "paid_confirmed" && b.slot_date < today);
  const incomplete = bookings.filter((b) => b.status !== "paid_confirmed");

  const voucherStatusLabels: Record<GiftVoucherStatus, string> = dict.voucherStatus;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">{dict.heading}</h1>
        <Link
          href={pathPrefix || "/"}
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {dict.bookATrip}
        </Link>
      </div>

      {notice && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          {notice}
        </p>
      )}
      {actionError && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {actionError}
        </p>
      )}

      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-ink">{dict.upcoming}</h2>
        <div className="mt-2 rounded-lg border border-sand-deep bg-white">
          {upcoming.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">{dict.noUpcoming}</p>
          ) : (
            upcoming.map((b) => (
              <BookingRow
                key={b.id}
                b={b}
                pathPrefix={pathPrefix}
                statusLabels={statusLabels}
                viewDetails={dict.viewDetails}
              />
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-ink">{dict.past}</h2>
        <div className="mt-2 rounded-lg border border-sand-deep bg-white">
          {past.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">{dict.noPast}</p>
          ) : (
            past.map((b) => (
              <BookingRow
                key={b.id}
                b={b}
                pathPrefix={pathPrefix}
                statusLabels={statusLabels}
                viewDetails={dict.viewDetails}
              />
            ))
          )}
        </div>
      </section>

      {incomplete.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-ink">{dict.incomplete}</h2>
          <p className="mt-1 text-xs text-ink-soft">{dict.incompleteDesc}</p>
          <div className="mt-2 rounded-lg border border-sand-deep bg-white">
            {incomplete.map((b) => (
              <BookingRow
                key={b.id}
                b={b}
                pathPrefix={pathPrefix}
                statusLabels={statusLabels}
                viewDetails={dict.viewDetails}
              />
            ))}
          </div>
        </section>
      )}

      {purchasedVouchers.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-ink">{dict.giftVouchersGiven}</h2>
          <div className="mt-2 rounded-lg border border-sand-deep bg-white">
            {purchasedVouchers.map((v) => (
              <div key={v.id} className="border-t border-sand-deep px-4 py-3 text-sm first:border-t-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink">{v.products?.title ?? "Trip"}</p>
                    <p className="text-ink-soft">
                      {dict.forRecipient(v.recipient_name)} ·{" "}
                      <span className="font-mono">{v.redemption_code}</span> ·{" "}
                      {formatIdr(v.value_amount_idr)} · {voucherStatusLabels[v.status]}
                    </p>
                  </div>
                  {v.status === "issued" && !v.cancellation_requested_at && (
                    <details className="relative">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-coral-dark hover:underline">
                        {dict.requestRefund}
                      </summary>
                      <form
                        action={requestGiftVoucherRefundAction.bind(null, v.id)}
                        className="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-2 rounded-lg border border-sand-deep bg-white p-3 shadow-lg"
                      >
                        <input type="hidden" name="return_to" value={`${pathPrefix}/account/bookings`} />
                        <input type="hidden" name="locale" value={locale} />
                        <textarea
                          name="reason"
                          rows={3}
                          required
                          placeholder={dict.refundReasonPlaceholder}
                          className="rounded-lg border border-sand-deep px-2 py-1 text-xs outline-none focus:border-teal"
                        />
                        <button
                          type="submit"
                          className="self-start rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          {dict.submitRequest}
                        </button>
                      </form>
                    </details>
                  )}
                </div>
                {v.cancellation_requested_at && (
                  <p className="mt-1 text-xs text-teal">
                    {dict.refundRequestedOn(new Date(v.cancellation_requested_at).toLocaleDateString())}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
