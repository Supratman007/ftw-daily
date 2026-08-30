import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { daysBeforeDeparture, resolveCancellationRefundPercent } from "@/lib/cancellations/policy";
import { submitCancellationRequestAction } from "./actions";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

/**
 * Spec §6f: a customer-initiated cancellation/reschedule request.
 * Standard path shows the calculated refund instantly (computed from
 * today's date vs. the trip date against the current policy tiers) so
 * there's no surprise before submitting; force majeure always needs
 * evidence and manual review, so no number is shown for it.
 */
export default async function RequestCancellationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const customer = await requireCustomer(`/account/booking/${id}/cancel`);

  const supabase = await createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_code, slot_date, total_idr, status, products(title)")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!booking) {
    notFound();
  }
  if (booking.status !== "paid_confirmed") {
    redirect(`/account/booking/${id}`);
  }

  const { count: pendingCount } = await supabase
    .from("cancellation_requests")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", id)
    .eq("status", "pending_review");
  if ((pendingCount ?? 0) > 0) {
    redirect(`/account/booking/${id}`);
  }

  const { data: tiers } = await supabase
    .from("cancellation_policy_tiers")
    .select("id, min_days_before_departure, refund_percent");

  const today = new Date().toISOString().slice(0, 10);
  const daysOut = daysBeforeDeparture(booking.slot_date, today);
  const refundPercent = resolveCancellationRefundPercent(tiers ?? [], daysOut);
  const estimatedRefundIdr = Math.round(booking.total_idr * (refundPercent / 100));

  const productTitle =
    (booking as unknown as { products: { title: string } | null }).products?.title ?? "your trip";

  return (
    <div className="max-w-xl">
      <Link
        href={`/account/booking/${id}`}
        className="text-sm font-semibold text-teal hover:underline"
      >
        ← Back to booking
      </Link>

      <h1 className="mt-3 font-serif text-2xl font-semibold text-ink">
        Request cancellation or reschedule
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {productTitle} · {booking.booking_code}
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <form
        action={submitCancellationRequestAction.bind(null, id)}
        encType="multipart/form-data"
        className="mt-6 flex flex-col gap-6"
      >
        <fieldset className="rounded-2xl border border-sand-deep bg-white p-5">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="radio" name="path" value="standard" defaultChecked required className="mt-1" />
            <span>
              <span className="font-semibold">Standard cancellation</span>
              <p className="mt-1 text-ink-soft">
                {daysOut >= 2
                  ? "2+ days before departure: 90% refund."
                  : daysOut === 1
                    ? "1 day before departure: 65% refund."
                    : "Same-day or no-show: 0% refund."}{" "}
                Based on your trip date ({booking.slot_date}), your estimated refund is{" "}
                <strong>{formatIdr(estimatedRefundIdr)}</strong> of {formatIdr(booking.total_idr)}{" "}
                paid. A staff member will confirm before anything is refunded.
              </p>
            </span>
          </label>
        </fieldset>

        <fieldset className="rounded-2xl border border-sand-deep bg-white p-5">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="radio" name="path" value="force_majeure" className="mt-1" />
            <span>
              <span className="font-semibold">Force majeure (illness, emergency, etc.)</span>
              <p className="mt-1 text-ink-soft">
                Bypasses the fee schedule entirely -- upload supporting documentation (e.g. a
                medical note) and we&apos;ll review it. If approved, you&apos;ll get either a free
                reschedule or a gift voucher for the full value.
              </p>
            </span>
          </label>
          <div className="mt-3">
            <label className={labelClass} htmlFor="evidence">
              Supporting documentation (required for force majeure)
            </label>
            <input
              id="evidence"
              name="evidence"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="mt-1 block w-full text-sm text-ink-soft"
            />
            <p className="mt-1 text-xs text-ink-soft">JPG, PNG, or PDF, up to 5MB.</p>
          </div>
        </fieldset>

        <div>
          <label className={labelClass} htmlFor="reason">
            Tell us what happened
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            required
            className={inputClass}
            placeholder="A short explanation helps us review this faster."
          />
        </div>

        <button
          type="submit"
          className="self-start rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-white"
        >
          Submit request
        </button>
      </form>
    </div>
  );
}
