import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { markVoucherRedeemedAction, markVoucherExpiredAction } from "./actions";
import type { GiftVoucher } from "@/lib/cancellations/types";

type VoucherRow = GiftVoucher & { products: { title: string } | null };

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Redemption requested" },
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
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeFilter = status ?? "pending";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("gift_vouchers")
    .select("*, products(title)")
    .order("issued_at", { ascending: false });

  if (activeFilter === "pending") {
    query = query.eq("status", "issued").not("redemption_requested_at", "is", null);
  } else if (activeFilter === "issued") {
    query = query.eq("status", "issued").is("redemption_requested_at", null);
  } else if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data, error } = await query;
  const vouchers = (data ?? []) as unknown as VoucherRow[];
  const returnTo = `/admin/vouchers?status=${activeFilter}`;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Gift vouchers</h1>

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

      <div className="mt-6 flex flex-col gap-4">
        {vouchers.length === 0 && !error && (
          <p className="rounded-lg border border-sand-deep bg-white px-4 py-8 text-center text-sm text-ink-soft">
            Nothing here right now.
          </p>
        )}

        {vouchers.map((v) => (
          <div key={v.id} className="rounded-2xl border border-sand-deep bg-white p-5 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
                {v.redemption_code}
              </p>
              <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase text-ink-soft">
                {v.status}
              </span>
            </div>
            <p className="mt-1 font-semibold text-ink">{v.products?.title ?? "Trip"}</p>
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
                {v.redemption_message && (
                  <p className="mt-1 text-ink-soft">&quot;{v.redemption_message}&quot;</p>
                )}
                <p className="mt-1 text-xs text-teal">
                  Requested {new Date(v.redemption_requested_at).toLocaleString()}
                </p>
              </div>
            )}

            {v.status === "issued" && (
              <div className="mt-3 flex gap-3 border-t border-sand-deep pt-3">
                <form action={markVoucherRedeemedAction.bind(null, v.id)}>
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button
                    type="submit"
                    className="rounded-lg bg-coral px-4 py-2 text-xs font-semibold text-white"
                  >
                    Mark redeemed (booking created)
                  </button>
                </form>
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
        ))}
      </div>

      <p className="mt-6 text-xs text-ink-soft">
        Recipients submit requests at{" "}
        <Link href="/redeem" className="font-semibold text-teal hover:underline">
          /redeem
        </Link>
        . Creating their new booking is still a manual step -- this page just tracks it.
      </p>
    </div>
  );
}
