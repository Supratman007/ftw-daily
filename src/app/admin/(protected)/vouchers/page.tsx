import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import {
  confirmVoucherRedemptionAction,
  markVoucherExpiredAction,
  approveGiftVoucherRefundAction,
  declineGiftVoucherRefundAction,
} from "./actions";
import type { GiftVoucher, GiftVoucherStatus } from "@/lib/cancellations/types";

type VoucherRow = GiftVoucher & { products: { title: string } | null };

const VOUCHER_STATUS_LABELS: Record<GiftVoucherStatus, string> = {
  pending_payment: "Processing payment",
  issued: "Issued",
  redeemed: "Redeemed",
  expired: "Expired",
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Redemption requested" },
  { value: "refund_requested", label: "Refund requested" },
  { value: "issued", label: "Issued, not yet requested" },
  { value: "redeemed", label: "Redeemed" },
  { value: "expired", label: "Expired" },
  { value: "all", label: "All" },
];

/**
 * Every gift voucher issued through the cancellation flow (§6f), plus
 * whatever the recipient submitted at the public /redeem page. The
 * "pending" filter (the default) is the actual to-do list: a
 * redemption request came in and nobody's actioned it yet. Actually
 * creating the recipient's new booking still happens the normal way
 * (product page or manual admin booking) -- this page is just where
 * you confirm you've done that.
 */
export default async function AdminVouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; notice?: string; error?: string }>;
}) {
  await requireAdmin();
  const { status, notice, error: actionError } = await searchParams;
  const activeFilter = status ?? "pending";
  const nowIso = new Date().toISOString();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("gift_vouchers")
    .select("*, products(title)")
    .order("issued_at", { ascending: false });

  // A voucher past its expires_at is treated as expired everywhere
  // (here and on /redeem) without anyone having to remember to click
  // "Mark expired" -- that button still exists for tidying up the
  // record, but nothing depends on it being clicked.
  if (activeFilter === "pending") {
    query = query.eq("status", "issued").not("redemption_requested_at", "is", null).gte("expires_at", nowIso);
  } else if (activeFilter === "refund_requested") {
    query = query.eq("status", "issued").not("cancellation_requested_at", "is", null);
  } else if (activeFilter === "issued") {
    query = query.eq("status", "issued").is("redemption_requested_at", null).gte("expires_at", nowIso);
  } else if (activeFilter === "expired") {
    query = query.or(`status.eq.expired,and(status.eq.issued,expires_at.lt.${nowIso})`);
  } else if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data, error } = await query;
  const vouchers = (data ?? []) as unknown as VoucherRow[];
  const returnTo = `/admin/vouchers?status=${activeFilter}`;

  // Outstanding liability: every still-valid, unredeemed voucher's
  // value adds up to real money you owe if it's ever redeemed --
  // independent of whatever the filter above is set to, since this is
  // meant to answer "how much am I on the hook for right now" at a
  // glance, not "what matches the current filter."
  const { data: outstandingData } = await supabase
    .from("gift_vouchers")
    .select("value_amount_idr")
    .eq("status", "issued")
    .gte("expires_at", nowIso);
  const outstandingVouchers = outstandingData ?? [];
  const outstandingTotalIdr = outstandingVouchers.reduce((sum, v) => sum + v.value_amount_idr, 0);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Gift vouchers</h1>

      <p className="mt-1 text-sm text-ink-soft">
        Outstanding liability:{" "}
        <span className="font-semibold text-ink">{formatIdr(outstandingTotalIdr)}</span> across{" "}
        {outstandingVouchers.length} still-valid, unredeemed voucher
        {outstandingVouchers.length === 1 ? "" : "s"}.
      </p>

      <form method="GET" className="mt-4 flex gap-3">
        <select
          name="status"
          defaultValue={activeFilter}
          className="rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Filter
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          Couldn&apos;t load vouchers: {error.message}
        </p>
      )}
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

      <div className="mt-6 flex flex-col gap-4">
        {vouchers.length === 0 && !error && (
          <p className="rounded-lg border border-sand-deep bg-white px-4 py-8 text-center text-sm text-ink-soft">
            Nothing here right now.
          </p>
        )}

        {vouchers.map((v) => {
          const isExpiredByDate = v.status === "issued" && new Date(v.expires_at) < new Date();
          const displayStatus = VOUCHER_STATUS_LABELS[isExpiredByDate ? "expired" : v.status];
          return (
          <div key={v.id} className="rounded-2xl border border-sand-deep bg-white p-5 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
                {v.redemption_code}
              </p>
              <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase text-ink-soft">
                {displayStatus}
              </span>
            </div>
            <p className="mt-1 font-semibold text-ink">{v.products?.title ?? "Trip"}</p>
            <p className="text-xs text-ink-soft">
              {v.original_booking_id ? "From a cancellation" : "Purchased directly as a gift"}
            </p>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Originally for</dt>
                <dd className="text-ink">
                  {v.recipient_name} ({v.recipient_contact})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Value</dt>
                <dd className="text-ink">{formatIdr(v.value_amount_idr)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Expires</dt>
                <dd className="text-ink">{new Date(v.expires_at).toLocaleDateString()}</dd>
              </div>
            </dl>

            {v.redemption_requested_at && (
              <div className="mt-3 rounded-lg bg-[#E3F2F1] p-3 text-teal">
                <p className="text-xs font-semibold uppercase tracking-wide">Redemption request</p>
                <p className="mt-1 text-ink">
                  {v.redeemed_by_name} · {v.redeemed_by_email}
                  {v.redeemed_by_phone && ` · ${v.redeemed_by_phone}`}
                </p>
                {v.requested_slot_date && <p className="text-ink">Preferred date: {v.requested_slot_date}</p>}
                {v.requested_pax_count && (
                  <p className="text-ink">
                    Travelers: {v.requested_pax_count}
                  </p>
                )}
                {v.redemption_message && (
                  <p className="mt-1 text-ink-soft">&quot;{v.redemption_message}&quot;</p>
                )}
                <p className="mt-1 text-xs text-teal">
                  Requested {new Date(v.redemption_requested_at).toLocaleString()}
                </p>
              </div>
            )}

            {v.cancellation_requested_at && v.status === "issued" && (
              <div className="mt-3 rounded-lg bg-[#FCE6DD] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-coral-dark">
                  Refund requested
                </p>
                {v.cancellation_reason && (
                  <p className="mt-1 text-ink">&quot;{v.cancellation_reason}&quot;</p>
                )}
                <p className="mt-1 text-xs text-coral-dark">
                  Requested {new Date(v.cancellation_requested_at).toLocaleString()}
                </p>
                <div className="mt-3 flex flex-col gap-3 border-t border-coral pt-3 sm:flex-row sm:items-start">
                  <form action={approveGiftVoucherRefundAction.bind(null, v.id)}>
                    <input type="hidden" name="return_to" value={returnTo} />
                    <button
                      type="submit"
                      className="rounded-lg bg-coral px-4 py-2 text-xs font-semibold text-white"
                    >
                      Approve refund ({formatIdr(v.value_amount_idr)})
                    </button>
                  </form>
                  <form
                    action={declineGiftVoucherRefundAction.bind(null, v.id)}
                    className="flex flex-1 flex-col gap-2"
                  >
                    <input type="hidden" name="return_to" value={returnTo} />
                    <textarea
                      name="admin_notes"
                      rows={2}
                      placeholder="Reason for declining (shown to the customer, optional)"
                      className="rounded-lg border border-sand-deep px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      className="self-start rounded-lg border border-coral px-4 py-2 text-xs font-semibold text-coral-dark hover:bg-white"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            )}

            {v.status === "redeemed" && v.redeemed_booking_id && (
              <p className="mt-3 border-t border-sand-deep pt-3 text-ink-soft">
                Booked --{" "}
                <Link
                  href={`/admin/bookings/${v.redeemed_booking_id}`}
                  className="font-semibold text-teal hover:underline"
                >
                  view booking →
                </Link>
              </p>
            )}

            {v.status === "issued" &&
              v.redemption_requested_at &&
              !isExpiredByDate &&
              !v.cancellation_requested_at && (
              <form
                action={confirmVoucherRedemptionAction.bind(null, v.id)}
                className="mt-3 flex flex-wrap items-end gap-3 border-t border-sand-deep pt-3"
              >
                <input type="hidden" name="return_to" value={returnTo} />
                <div>
                  <label className="block text-xs text-ink-soft" htmlFor={`slot_date_${v.id}`}>
                    Trip date
                  </label>
                  <input
                    id={`slot_date_${v.id}`}
                    type="date"
                    name="slot_date"
                    defaultValue={v.requested_slot_date ?? undefined}
                    className="mt-1 rounded-lg border border-sand-deep px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-soft" htmlFor={`pax_count_${v.id}`}>
                    Travelers
                  </label>
                  <input
                    id={`pax_count_${v.id}`}
                    type="number"
                    name="pax_count"
                    min={1}
                    max={20}
                    defaultValue={v.requested_pax_count ?? undefined}
                    className="mt-1 w-20 rounded-lg border border-sand-deep px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-coral px-4 py-2 text-xs font-semibold text-white"
                >
                  Confirm &amp; create booking
                </button>
              </form>
            )}

            {isExpiredByDate && (
              <p className="mt-3 border-t border-sand-deep pt-3 text-coral-dark">
                This voucher&apos;s expiry date has passed -- it can no longer be redeemed.
              </p>
            )}

            {v.status === "issued" && !isExpiredByDate && (
              <div className="mt-3 flex gap-3 border-t border-sand-deep pt-3">
                <form action={markVoucherExpiredAction.bind(null, v.id)}>
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button
                    type="submit"
                    className="rounded-lg border border-sand-deep px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-sand"
                  >
                    Mark expired
                  </button>
                </form>
              </div>
            )}
          </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink-soft">
        Recipients submit requests at{" "}
        <Link href="/redeem" className="font-semibold text-teal hover:underline">
          /redeem
        </Link>
        . &quot;Confirm &amp; create booking&quot; creates their trip automatically -- it just
        needs an account to attach it to, so it asks the recipient to sign up first if they
        haven&apos;t.
      </p>
    </div>
  );
}
