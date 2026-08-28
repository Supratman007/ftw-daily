import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd } from "@/lib/currency";
import { BOOKING_STATUS_LABELS, type Booking, type Traveler } from "@/lib/bookings/types";
import { resendConfirmationEmailAction } from "./actions";

type BookingWithProduct = Booking & { products: { title: string; slug: string } | null };

/**
 * Spec §6h booking detail page. Built here: trip info, contact info,
 * and the "view confirmation email" action for upcoming bookings, plus
 * the manual-confirmation flow's status-specific states (§6b) --
 * under review, confirmed-with-payment-link-and-deadline, declined
 * (with reason), and the traveler/passport-received list. Deliberately
 * not built yet: in-app chat, reschedule/gift/review actions -- all
 * gated behind Phase 2/3 infrastructure that doesn't exist yet.
 */
export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resent?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { resent, notice } = await searchParams;
  const customer = await requireCustomer(`/account/booking/${id}`);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bookings")
    .select("*, products(title, slug)")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const b = data as BookingWithProduct;

  const isManualConfirmation =
    b.status === "under_review" ||
    b.status === "confirmed_awaiting_payment" ||
    b.status === "declined";

  let travelers: Traveler[] = [];
  if (isManualConfirmation) {
    const { data: travelerRows } = await supabase
      .from("travelers")
      .select("id, booking_id, full_name, passport_scan_path, insurance_type, insurance_number, insurance_company, insurance_fee_idr, created_at")
      .eq("booking_id", b.id)
      .order("created_at", { ascending: true });
    travelers = (travelerRows ?? []) as Traveler[];
  }

  return (
    <div className="max-w-xl">
      <Link href="/account/bookings" className="text-sm font-semibold text-teal hover:underline">
        ← Back to My Bookings
      </Link>

      <h1 className="mt-3 font-serif text-2xl font-semibold text-ink">
        {b.products?.title ?? "Trip"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Booking code <span className="font-semibold text-ink">{b.booking_code}</span> ·{" "}
        {BOOKING_STATUS_LABELS[b.status]}
      </p>

      {notice && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          {notice}
        </p>
      )}
      {resent && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Confirmation email resent.
        </p>
      )}

      {b.status === "under_review" && (
        <p className="mt-4 rounded-lg border border-sand-deep bg-white p-4 text-sm text-ink-soft">
          We&apos;re checking park permit availability for your dates -- nothing has been charged
          yet. We&apos;ll email you as soon as we know, usually within a day or two.
        </p>
      )}

      {b.status === "confirmed_awaiting_payment" && (
        <div className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-4 text-sm text-teal">
          <p>Park permits are available -- complete payment to lock in your spot.</p>
          {b.confirmation_deadline && (
            <p className="mt-1 font-semibold">
              Payment due by {new Date(b.confirmation_deadline).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {b.status === "declined" && (
        <div className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-4 text-sm text-coral-dark">
          <p className="font-semibold">We couldn&apos;t confirm this request.</p>
          {b.decline_reason && <p className="mt-1">{b.decline_reason}</p>}
          <p className="mt-1">Nothing was charged. Feel free to request a different date.</p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
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
        {b.insurance_total_idr > 0 && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Park insurance</span>
            <span className="text-ink">{formatIdr(b.insurance_total_idr)}</span>
          </div>
        )}
        <div className="flex justify-between py-2">
          <span className="text-ink-soft">
            Total{b.status === "paid_confirmed" ? " paid" : ""}
          </span>
          <span className="font-semibold text-ink">{formatIdr(b.total_idr)}</span>
        </div>
      </div>

      {isManualConfirmation && travelers.length > 0 && (
        <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
          <p className="font-semibold text-ink">Travelers</p>
          <div className="mt-2 flex flex-col gap-2">
            {travelers.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-t border-sand-deep pt-2 first:border-t-0 first:pt-0">
                <span className="text-ink">{t.full_name}</span>
                <span className="text-xs text-ink-soft">
                  {t.insurance_type === "park_provided" ? "Park insurance" : "Own insurance"} ·{" "}
                  {t.passport_scan_path ? "Passport received ✓" : "Passport not received"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
        <p className="font-semibold text-ink">Contact</p>
        <p className="mt-1 text-ink-soft">{customer.email}</p>
        {customer.phone && <p className="text-ink-soft">{customer.phone}</p>}
      </div>

      {(b.hotel_name || b.room_number) && (
        <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
          <p className="font-semibold text-ink">Pickup</p>
          {b.hotel_name && <p className="mt-1 text-ink-soft">{b.hotel_name}</p>}
          {b.room_number && <p className="text-ink-soft">Room {b.room_number}</p>}
        </div>
      )}

      {b.status === "paid_confirmed" && (
        <form action={resendConfirmationEmailAction.bind(null, b.id)} className="mt-6">
          <button
            type="submit"
            className="rounded-lg border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-[#E3F2F1]"
          >
            Resend confirmation email
          </button>
        </form>
      )}

      {(b.status === "pending_payment" || b.status === "confirmed_awaiting_payment") &&
        b.xendit_invoice_url && (
          <a
            href={b.xendit_invoice_url}
            className="mt-6 inline-block rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
          >
            Complete payment
          </a>
        )}
    </div>
  );
}
