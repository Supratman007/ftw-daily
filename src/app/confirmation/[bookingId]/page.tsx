import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd } from "@/lib/currency";

interface BookingRow {
  id: string;
  booking_code: string;
  slot_date: string;
  pax_count: number;
  total_idr: number;
  status: "pending_payment" | "paid_confirmed" | "expired" | "cancelled";
  product_id: string;
  discount_code: string | null;
  discount_amount_usd: number;
}

/**
 * Where Xendit's success_redirect_url sends a customer right after they
 * pay. The webhook (src/app/api/webhooks/xendit/route.ts) is what
 * actually marks the booking paid, and it can arrive a few seconds
 * after this redirect does -- so "pending_payment" here doesn't mean
 * something went wrong, just that the confirmation hasn't landed yet.
 * A short meta-refresh re-checks without the customer having to do
 * anything.
 */
export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const customer = await requireCustomer(`/confirmation/${bookingId}`);

  const supabase = await createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, booking_code, slot_date, pax_count, total_idr, status, product_id, discount_code, discount_amount_usd"
    )
    .eq("id", bookingId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!booking) {
    notFound();
  }
  const b = booking as BookingRow;

  const { data: product } = await supabase
    .from("products")
    .select("title, slug")
    .eq("id", b.product_id)
    .maybeSingle();

  if (b.status === "pending_payment") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <meta httpEquiv="refresh" content="4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          Booking {b.booking_code}
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-ocean">
          Confirming your payment&hellip;
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          This usually takes just a few seconds. This page will update on its own -- no need to
          refresh.
        </p>
      </main>
    );
  }

  if (b.status === "expired" || b.status === "cancelled") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          Booking {b.booking_code}
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-coral-dark">
          Payment didn&apos;t go through
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          This booking wasn&apos;t completed, so nothing was charged. You can try again from the
          trip page.
        </p>
        {product?.slug && (
          <a
            href={`/p/${product.slug}`}
            className="mt-6 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
          >
            Back to trip
          </a>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-teal">Booking confirmed</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ocean">
        {product?.title ?? "Your trip"}
      </h1>

      <div className="mt-6 w-full rounded-2xl border border-sand-deep bg-white p-6 text-left text-sm">
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Booking code</span>
          <span className="font-semibold text-ink">{b.booking_code}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Date</span>
          <span className="text-ink">{b.slot_date}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Travelers</span>
          <span className="text-ink">{b.pax_count}</span>
        </div>
        {b.discount_code && b.discount_amount_usd > 0 && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Discount ({b.discount_code})</span>
            <span className="text-teal">-{formatUsd(b.discount_amount_usd)}</span>
          </div>
        )}
        <div className="flex justify-between py-2">
          <span className="text-ink-soft">Total paid</span>
          <span className="font-semibold text-ink">{formatIdr(b.total_idr)}</span>
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        A confirmation email is on its way to you. See you on the trip!
      </p>

      <Link
        href="/"
        className="mt-6 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        Browse more trips
      </Link>
    </main>
  );
}
