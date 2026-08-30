import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { formatIdr, formatUsd } from "@/lib/currency";
import { BOOKING_STATUS_LABELS, type Booking, type Traveler } from "@/lib/bookings/types";
import { resendConfirmationEmailAction } from "./actions";
import { sendCustomerMessageAction } from "./chat-actions";
import { customerLogoutAction } from "@/app/actions";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatRealtimeRefresher } from "@/components/chat/ChatRealtimeRefresher";
import type { Message } from "@/lib/chat/types";
import {
  CANCELLATION_PREFERRED_RESOLUTION_LABELS,
  CANCELLATION_STATUS_LABELS,
  type CancellationRequest,
  type GiftVoucher,
} from "@/lib/cancellations/types";

type BookingWithProduct = Booking & { products: { title: string; slug: string } | null };

/**
 * Spec §6h booking detail page. Built here: trip info, contact info,
 * the "view confirmation email" action for upcoming bookings, the
 * manual-confirmation flow's status-specific states (§6b) -- under
 * review, confirmed-with-payment-link-and-deadline, declined (with
 * reason), and the traveler/passport-received list -- the per-booking
 * chat thread (§6b/§6c), and the cancellation/reschedule request flow
 * (§6f) at the bottom. Deliberately not built yet: review submission
 * -- gated behind Phase 3 infrastructure that doesn't exist yet.
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
    // Same "wrong account" vs "doesn't exist" distinction as
    // /confirmation/[bookingId] -- RLS hides both identically from
    // the customer's own session client, and a link opened while
    // signed into a different account was landing on a bare 404 with
    // no explanation. Service-role client only decides which message
    // to show; it never renders the other booking's actual details.
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: anyBooking } = await serviceClient
      .from("bookings")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (anyBooking) {
      return (
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Wrong account
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-coral-dark">
            This booking isn&apos;t linked to {customer.email}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            You&apos;re currently signed in as {customer.email}, but this booking was made under a
            different account. Log out and sign back in with the email you used when booking.
          </p>
          <form action={customerLogoutAction} className="mt-6">
            <button
              type="submit"
              className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
            >
              Log out
            </button>
          </form>
        </div>
      );
    }

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

  // Only fetch messages if a thread already exists -- viewing this
  // page shouldn't create one; sendCustomerMessageAction creates it
  // lazily on the first message actually sent.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("booking_id", b.id)
    .maybeSingle();

  let messages: Message[] = [];
  if (conversation) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    messages = (messageRows ?? []) as Message[];
  }

  const { data: cancellationRows } = await supabase
    .from("cancellation_requests")
    .select("*")
    .eq("booking_id", b.id)
    .order("requested_at", { ascending: false })
    .limit(1);
  const latestCancellationRequest = (cancellationRows?.[0] ?? null) as CancellationRequest | null;

  const { data: voucherRows } = await supabase
    .from("gift_vouchers")
    .select("*")
    .eq("original_booking_id", b.id);
  const vouchers = (voucherRows ?? []) as GiftVoucher[];

  const canRequestCancellation =
    b.status === "paid_confirmed" && latestCancellationRequest?.status !== "pending_review";

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

      {latestCancellationRequest && (
        <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink">Cancellation / reschedule request</p>
            <span className="text-xs font-semibold uppercase text-ink-soft">
              {CANCELLATION_STATUS_LABELS[latestCancellationRequest.status]}
            </span>
          </div>

          {latestCancellationRequest.status === "pending_review" && (
            <p className="mt-2 text-ink-soft">
              We&apos;re reviewing your request
              {latestCancellationRequest.preferred_resolution &&
                ` for "${CANCELLATION_PREFERRED_RESOLUTION_LABELS[latestCancellationRequest.preferred_resolution]}"`}{" "}
              -- we&apos;ll email you once it&apos;s decided.
            </p>
          )}

          {latestCancellationRequest.status === "approved" &&
            latestCancellationRequest.resolution === "refund" && (
              <p className="mt-2 text-ink-soft">
                Approved -- a refund of{" "}
                <span className="font-semibold text-ink">
                  {formatIdr(latestCancellationRequest.calculated_refund_amount_idr ?? 0)}
                </span>{" "}
                is being processed.
              </p>
            )}

          {latestCancellationRequest.status === "approved" &&
            latestCancellationRequest.resolution === "reschedule" && (
              <p className="mt-2 text-ink-soft">
                Approved -- your trip has been rescheduled to{" "}
                <span className="font-semibold text-ink">{b.slot_date}</span>, no fee.
              </p>
            )}

          {latestCancellationRequest.status === "approved" &&
            latestCancellationRequest.resolution === "gift_voucher" &&
            vouchers[0] && (
              <div className="mt-2 text-ink-soft">
                <p>Approved -- converted into a gift voucher for {vouchers[0].recipient_name}:</p>
                <div className="mt-2 flex justify-between border-t border-sand-deep pt-2">
                  <span>Code</span>
                  <span className="font-mono font-semibold text-ink">
                    {vouchers[0].redemption_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Value</span>
                  <span className="text-ink">{formatIdr(vouchers[0].value_amount_idr)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires</span>
                  <span className="text-ink">
                    {new Date(vouchers[0].expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

          {latestCancellationRequest.status === "rejected" && (
            <p className="mt-2 text-ink-soft">
              This request wasn&apos;t approved.
              {latestCancellationRequest.admin_notes && ` ${latestCancellationRequest.admin_notes}`}
            </p>
          )}
        </div>
      )}

      {canRequestCancellation && (
        <Link
          href={`/account/booking/${b.id}/cancel`}
          className="mt-6 inline-block rounded-lg border border-sand-deep px-4 py-2 text-sm font-semibold text-ink hover:bg-sand"
        >
          Request cancellation or reschedule
        </Link>
      )}

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white">
        <div className="border-b border-sand-deep p-4">
          <p className="font-semibold text-ink">Message us about this trip</p>
          <p className="text-xs text-ink-soft">
            Questions about your booking land here -- we&apos;ll reply as soon as we can.
          </p>
        </div>
        <ChatThread messages={messages} viewerRole="customer" />
        <ChatComposer action={sendCustomerMessageAction.bind(null, b.id)} />
      </div>
      {conversation && <ChatRealtimeRefresher conversationId={conversation.id} />}
    </div>
  );
}
