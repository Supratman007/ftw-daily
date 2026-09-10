import Link from "next/link";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/bookings/types";
import { REPORT_PRESETS, resolveReportRange } from "@/lib/reports/dateRange";

const cardClass = "rounded-2xl border border-sand-deep bg-white p-5";

type RevenueRow = { total_idr: number; product_id: string; products: { title: string } | null };
type TransactionRow = {
  id: string;
  booking_code: string;
  slot_date: string;
  total_idr: number;
  status: BookingStatus;
  created_at: string;
  products: { title: string } | null;
  customers: { name: string; email: string } | null;
};

/**
 * Spec §6k's "financial reports" for Accounting, finally a real page
 * rather than just the dashboard's single revenue number. Everything
 * here (except the payment-status snapshot, which is deliberately
 * "right now" rather than date-scoped) is filtered to the chosen date
 * range, and the same range carries over to the CSV download so what
 * you see on screen is always what you get in the file.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await requireAdminSection("reports");
  const { preset: presetParam, from: fromParam, to: toParam } = await searchParams;
  const range = resolveReportRange(presetParam, fromParam, toParam);

  const supabase = await createSupabaseServerClient();

  // Revenue (confirmed bookings only) within the range, also grouped
  // by product below for "Revenue by trip/product".
  let revenueQuery = supabase
    .from("bookings")
    .select("total_idr, product_id, products(title)")
    .eq("status", "paid_confirmed");
  if (range.from) revenueQuery = revenueQuery.gte("created_at", `${range.from}T00:00:00Z`);
  if (range.to) revenueQuery = revenueQuery.lte("created_at", `${range.to}T23:59:59Z`);

  // Payment status breakdown -- a live snapshot of every booking
  // regardless of the date range, not "bookings created in this
  // range": a pending_payment booking from months ago being still
  // pending is exactly the kind of thing this should surface.
  const snapshotQuery = supabase.from("bookings").select("status, total_idr");

  // The full transaction list for the range, any status -- same shape
  // as /admin/bookings, just date-scoped, feeding both the on-screen
  // table and the CSV export.
  let transactionsQuery = supabase
    .from("bookings")
    .select("id, booking_code, slot_date, total_idr, status, created_at, products(title), customers(name, email)")
    .order("created_at", { ascending: false });
  if (range.from) transactionsQuery = transactionsQuery.gte("created_at", `${range.from}T00:00:00Z`);
  if (range.to) transactionsQuery = transactionsQuery.lte("created_at", `${range.to}T23:59:59Z`);

  // Cancelled bookings -- filtered by when they were cancelled
  // (updated_at), not when they were originally created.
  let cancelledQuery = supabase.from("bookings").select("total_idr").eq("status", "cancelled");
  if (range.from) cancelledQuery = cancelledQuery.gte("updated_at", `${range.from}T00:00:00Z`);
  if (range.to) cancelledQuery = cancelledQuery.lte("updated_at", `${range.to}T23:59:59Z`);

  // Cash refunds approved via the cancellation queue.
  let cashRefundsQuery = supabase
    .from("cancellation_requests")
    .select("calculated_refund_amount_idr")
    .eq("status", "approved")
    .eq("resolution", "refund");
  if (range.from) cashRefundsQuery = cashRefundsQuery.gte("reviewed_at", `${range.from}T00:00:00Z`);
  if (range.to) cashRefundsQuery = cashRefundsQuery.lte("reviewed_at", `${range.to}T23:59:59Z`);

  // Bookings converted into a gift voucher instead of a cash refund --
  // sourced from gift_vouchers itself (issued_at lines up with the
  // moment of approval) rather than the cancellation_requests row,
  // since that's where the actual value lives.
  let voucherFromCancellationQuery = supabase
    .from("gift_vouchers")
    .select("value_amount_idr")
    .not("original_booking_id", "is", null);
  if (range.from) voucherFromCancellationQuery = voucherFromCancellationQuery.gte("issued_at", `${range.from}T00:00:00Z`);
  if (range.to) voucherFromCancellationQuery = voucherFromCancellationQuery.lte("issued_at", `${range.to}T23:59:59Z`);

  // Cash refunds on a purchased gift voucher that was never redeemed.
  let voucherRefundsQuery = supabase
    .from("gift_vouchers")
    .select("value_amount_idr")
    .not("refunded_at", "is", null);
  if (range.from) voucherRefundsQuery = voucherRefundsQuery.gte("refunded_at", `${range.from}T00:00:00Z`);
  if (range.to) voucherRefundsQuery = voucherRefundsQuery.lte("refunded_at", `${range.to}T23:59:59Z`);

  const [revenue, snapshot, transactions, cancelled, cashRefunds, vouchersFromCancellation, voucherRefunds] =
    await Promise.all([
      revenueQuery,
      snapshotQuery,
      transactionsQuery,
      cancelledQuery,
      cashRefundsQuery,
      voucherFromCancellationQuery,
      voucherRefundsQuery,
    ]);

  const revenueRows = (revenue.data ?? []) as unknown as RevenueRow[];
  const totalRevenueIdr = revenueRows.reduce((sum, r) => sum + r.total_idr, 0);
  const confirmedCount = revenueRows.length;

  const revenueByProduct = new Map<string, { title: string; total: number; count: number }>();
  for (const r of revenueRows) {
    const key = r.product_id;
    const existing = revenueByProduct.get(key);
    const title = r.products?.title ?? "Unknown trip";
    if (existing) {
      existing.total += r.total_idr;
      existing.count += 1;
    } else {
      revenueByProduct.set(key, { title, total: r.total_idr, count: 1 });
    }
  }
  const revenueByProductRows = Array.from(revenueByProduct.values()).sort((a, b) => b.total - a.total);

  const snapshotRows = (snapshot.data ?? []) as Array<{ status: BookingStatus; total_idr: number }>;
  const statusBreakdown = new Map<BookingStatus, { count: number; total: number }>();
  for (const r of snapshotRows) {
    const existing = statusBreakdown.get(r.status);
    if (existing) {
      existing.count += 1;
      existing.total += r.total_idr;
    } else {
      statusBreakdown.set(r.status, { count: 1, total: r.total_idr });
    }
  }

  const transactionRows = (transactions.data ?? []) as unknown as TransactionRow[];

  const cancelledRows = (cancelled.data ?? []) as Array<{ total_idr: number }>;
  const cancelledTotalIdr = cancelledRows.reduce((sum, r) => sum + r.total_idr, 0);

  const cashRefundRows = (cashRefunds.data ?? []) as Array<{ calculated_refund_amount_idr: number | null }>;
  const cashRefundTotalIdr = cashRefundRows.reduce((sum, r) => sum + (r.calculated_refund_amount_idr ?? 0), 0);

  const voucherFromCancellationRows = (vouchersFromCancellation.data ?? []) as Array<{ value_amount_idr: number }>;
  const voucherFromCancellationTotalIdr = voucherFromCancellationRows.reduce((sum, r) => sum + r.value_amount_idr, 0);

  const voucherRefundRows = (voucherRefunds.data ?? []) as Array<{ value_amount_idr: number }>;
  const voucherRefundTotalIdr = voucherRefundRows.reduce((sum, r) => sum + r.value_amount_idr, 0);

  const exportUrl = `/admin/reports/export?preset=${range.preset}&from=${range.from ?? ""}&to=${range.to ?? ""}`;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Reports</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Revenue, refunds and transactions for {range.label.toLowerCase()}.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {REPORT_PRESETS.map((p) => (
          <Link
            key={p.value}
            href={`/admin/reports?preset=${p.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              range.preset === p.value
                ? "border-teal bg-[#E3F2F1] text-teal"
                : "border-sand-deep text-ink-soft hover:bg-sand"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="preset" value="custom" />
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={range.preset === "custom" ? (range.from ?? undefined) : undefined}
            className="rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={range.preset === "custom" ? (range.to ?? undefined) : undefined}
            className="rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
          />
        </div>
        <button type="submit" className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white">
          Custom range
        </button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Confirmed revenue</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">{formatIdr(totalRevenueIdr)}</p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Confirmed bookings</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">{confirmedCount}</p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Cancelled ({range.label.toLowerCase()})
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">
            {cancelledRows.length} · {formatIdr(cancelledTotalIdr)}
          </p>
        </div>
      </div>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">Revenue by trip</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Bookings</th>
              <th className="px-4 py-2">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {revenueByProductRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ink-soft">
                  No confirmed bookings in this range.
                </td>
              </tr>
            ) : (
              revenueByProductRows.map((r) => (
                <tr key={r.title} className="border-t border-sand-deep">
                  <td className="px-4 py-2 text-ink">{r.title}</td>
                  <td className="px-4 py-2">{r.count}</td>
                  <td className="px-4 py-2 font-semibold text-ink">{formatIdr(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">Payment status right now</h2>
      <p className="mt-1 text-xs text-ink-soft">Not scoped to the date range above -- every booking, as of now.</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Bookings</th>
              <th className="px-4 py-2">Total value</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((status) => {
              const row = statusBreakdown.get(status);
              if (!row) return null;
              return (
                <tr key={status} className="border-t border-sand-deep">
                  <td className="px-4 py-2 text-ink">{BOOKING_STATUS_LABELS[status]}</td>
                  <td className="px-4 py-2">{row.count}</td>
                  <td className="px-4 py-2 font-semibold text-ink">{formatIdr(row.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">
        Refunds &amp; cancellations ({range.label.toLowerCase()})
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Cash refunds paid</p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">
            {cashRefundRows.length} · {formatIdr(cashRefundTotalIdr)}
          </p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Turned into gift vouchers
          </p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">
            {voucherFromCancellationRows.length} · {formatIdr(voucherFromCancellationTotalIdr)}
          </p>
        </div>
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Purchased vouchers refunded
          </p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">
            {voucherRefundRows.length} · {formatIdr(voucherRefundTotalIdr)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink">
          Transactions ({range.label.toLowerCase()})
        </h2>
        <a
          href={exportUrl}
          className="rounded-lg border border-sand-deep px-4 py-2 text-sm font-semibold text-teal hover:bg-sand"
        >
          Download CSV
        </a>
      </div>
      <div className="mt-2 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Booking code</th>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Purchase date</th>
            </tr>
          </thead>
          <tbody>
            {transactionRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  No bookings in this range.
                </td>
              </tr>
            ) : (
              transactionRows.map((t) => (
                <tr key={t.id} className="border-t border-sand-deep">
                  <td className="px-4 py-2 font-mono text-xs font-medium text-ink">{t.booking_code}</td>
                  <td className="px-4 py-2 text-ink">{t.products?.title ?? "—"}</td>
                  <td className="px-4 py-2 text-ink-soft">{t.customers?.name ?? "—"}</td>
                  <td className="px-4 py-2 font-semibold text-ink">{formatIdr(t.total_idr)}</td>
                  <td className="px-4 py-2">{BOOKING_STATUS_LABELS[t.status]}</td>
                  <td className="px-4 py-2 text-xs text-ink-soft">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
