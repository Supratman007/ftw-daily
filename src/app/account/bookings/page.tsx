import Link from "next/link";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { BOOKING_STATUS_LABELS, type Booking } from "@/lib/bookings/types";
import type { GiftVoucher, GiftVoucherStatus } from "@/lib/cancellations/types";
import { requestGiftVoucherRefundAction } from "./actions";

type BookingWithProduct = Booking & { products: { title: string; slug: string } | null };
type PurchasedVoucher = GiftVoucher & { products: { title: string } | null };

const GIFT_VOUCHER_STATUS_LABELS: Record<GiftVoucherStatus, string> = {
  pending_payment: "Processing payment",
  issued: "Ready to share",
  redeemed: "Redeemed",
  expired: "Expired",
};

function BookingRow({ b }: { b: BookingWithProduct }) {
  return (
    <div className="flex items-center justify-between border-t border-sand-deep px-4 py-3 text-sm first:border-t-0">
      <div>
        <p className="font-semibold text-ink">{b.products?.title ?? "Trip"}</p>
        <p className="text-ink-soft">
          {b.booking_code} · {b.slot_date} · {BOOKING_STATUS_LABELS[b.status]}
        </p>
      </div>
      <Link href={`/account/booking/${b.id}`} className="font-semibold text-teal hover:underline">
        View details
      </Link>
    </div>
  );
}

/** Spec §6h My Bookings: "The list view stays lean. Each row shows just
 * the title, booking code, date, and status -- plus one link: 'View
 * details.'" Split into upcoming/past per spec's "upcoming/completed
 * cards," plus an Incomplete section (not in spec, added so a booking
 * that never finished paying doesn't just silently vanish). */
export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const customer = await requireCustomer("/account/bookings");
  const { notice, error: actionError } = await searchParams;
  const supabase = await createSupabaseServerClient();

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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">My Bookings</h1>
        <Link
          href="/"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Book a trip
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
        <h2 className="font-serif text-lg font-semibold text-ink">Upcoming</h2>
        <div className="mt-2 rounded-lg border border-sand-deep bg-white">
          {upcoming.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">No upcoming trips.</p>
          ) : (
            upcoming.map((b) => <BookingRow key={b.id} b={b} />)
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-ink">Past</h2>
        <div className="mt-2 rounded-lg border border-sand-deep bg-white">
          {past.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">No past trips yet.</p>
          ) : (
            past.map((b) => <BookingRow key={b.id} b={b} />)
          )}
        </div>
      </section>

      {incomplete.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-ink">Incomplete</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Bookings that never completed payment, or a request still awaiting review.
          </p>
          <div className="mt-2 rounded-lg border border-sand-deep bg-white">
            {incomplete.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}

      {purchasedVouchers.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-ink">Gift vouchers you&apos;ve given</h2>
          <div className="mt-2 rounded-lg border border-sand-deep bg-white">
            {purchasedVouchers.map((v) => (
              <div key={v.id} className="border-t border-sand-deep px-4 py-3 text-sm first:border-t-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink">{v.products?.title ?? "Trip"}</p>
                    <p className="text-ink-soft">
                      For {v.recipient_name} ·{" "}
                      <span className="font-mono">{v.redemption_code}</span> ·{" "}
                      {formatIdr(v.value_amount_idr)} · {GIFT_VOUCHER_STATUS_LABELS[v.status]}
                    </p>
                  </div>
                  {v.status === "issued" && !v.cancellation_requested_at && (
                    <details className="relative">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-coral-dark hover:underline">
                        Request a refund
                      </summary>
                      <form
                        action={requestGiftVoucherRefundAction.bind(null, v.id)}
                        className="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-2 rounded-lg border border-sand-deep bg-white p-3 shadow-lg"
                      >
                        <textarea
                          name="reason"
                          rows={3}
                          required
                          placeholder="Why are you requesting a refund?"
                          className="rounded-lg border border-sand-deep px-2 py-1 text-xs outline-none focus:border-teal"
                        />
                        <button
                          type="submit"
                          className="self-start rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Submit request
                        </button>
                      </form>
                    </details>
                  )}
                </div>
                {v.cancellation_requested_at && (
                  <p className="mt-1 text-xs text-teal">
                    Refund requested {new Date(v.cancellation_requested_at).toLocaleDateString()} --
                    awaiting review.
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
