import Link from "next/link";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import { formatCommissionAmount } from "@/lib/agents/commission";
import { PrintButton } from "@/components/agent/PrintButton";
import type { CommissionStatus } from "@/lib/agents/types";

type ReportRow = {
  id: string;
  booking_code: string;
  slot_date: string;
  pax_count: number;
  total_idr: number;
  hotel_name: string | null;
  room_number: string | null;
  commission_amount_usd: number | null;
  commission_status: CommissionStatus | null;
  created_at: string;
  products: { title: string } | null;
  customers: { name: string } | null;
};

const STATUS_FILTERS: Array<{ value: CommissionStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
];

/**
 * The "sales report" -- every confirmed booking this agent referred,
 * with the commission it earned. Scoped to status='paid_confirmed'
 * only (a pending/expired referral never earned commission at all, so
 * it isn't a "sale" yet) -- the from/to/status filters here are
 * mirrored exactly by the CSV export route so a downloaded file always
 * matches whatever's on screen.
 *
 * Customer name + hotel/room (not email/phone -- an agent doesn't need
 * a customer's private contact details, just enough to cross-check a
 * sale against what they remember booking) so an agent can validate
 * this report against their own records if a commission is ever
 * disputed.
 *
 * Two tables render from the same `rows`, one active at a time via
 * print:hidden / print:table: a condensed one on screen (the full
 * 10-column version read as "messy" once real data filled it in --
 * screens are for scanning, a "View" link opens the one booking's full
 * detail on /agent/bookings/[id]) and every column on the printed
 * page/PDF, since a printout is a record meant to be complete, not
 * something you scan and click through.
 */
export default async function AgentBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const agent = await requireAgent();
  const { from, to, status } = await searchParams;
  const commissionStatus = status === "pending" || status === "paid" ? status : "all";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("bookings")
    .select(
      "id, booking_code, slot_date, pax_count, total_idr, hotel_name, room_number, commission_amount_usd, commission_status, created_at, products(title), customers(name)"
    )
    .eq("referred_by_agent_id", agent.id)
    .eq("status", "paid_confirmed")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  if (commissionStatus !== "all") query = query.eq("commission_status", commissionStatus);

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as ReportRow[];

  const totalCommissionUsd = rows.reduce((sum, r) => sum + (r.commission_amount_usd ?? 0), 0);
  const paidCommissionUsd = rows
    .filter((r) => r.commission_status === "paid")
    .reduce((sum, r) => sum + (r.commission_amount_usd ?? 0), 0);
  const totalSalesIdr = rows.reduce((sum, r) => sum + r.total_idr, 0);
  const avgCommissionUsd = rows.length > 0 ? totalCommissionUsd / rows.length : 0;
  const exportParams = new URLSearchParams();
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  if (commissionStatus !== "all") exportParams.set("status", commissionStatus);

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <h1 className="font-serif text-2xl font-semibold text-ink">Sales report</h1>
        <div className="flex items-center gap-3">
          <a
            href={`/agent/bookings/export?${exportParams.toString()}`}
            className="rounded-lg border border-sand-deep px-3 py-2 text-sm font-semibold text-ink hover:bg-sand"
          >
            Download CSV
          </a>
          <PrintButton />
        </div>
      </div>

      <p className="mt-1 font-serif text-lg text-ink print:mt-0">
        Adventure Lombok Booking — Sales report for {agent.name}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-sand-deep bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Sales</p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-sand-deep bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Total sale value
          </p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">
            {formatIdr(totalSalesIdr)}
          </p>
        </div>
        <div className="rounded-xl border border-sand-deep bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Avg. commission
          </p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">
            {formatCommissionAmount(avgCommissionUsd)}
          </p>
        </div>
        <div className="rounded-xl border border-sand-deep bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Commission paid
          </p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">
            {formatCommissionAmount(paidCommissionUsd)}{" "}
            <span className="text-sm font-normal text-ink-soft">
              / {formatCommissionAmount(totalCommissionUsd)}
            </span>
          </p>
        </div>
      </div>

      <form method="GET" className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          From
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="mt-1 block rounded-lg border border-sand-deep px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          To
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="mt-1 block rounded-lg border border-sand-deep px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Commission
          <select
            name="status"
            defaultValue={commissionStatus}
            className="mt-1 block rounded-lg border border-sand-deep px-3 py-2 text-sm"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Filter
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          Couldn&apos;t load your sales report: {error.message}
        </p>
      )}

      {/* Screen: condensed columns, one "View" per row for the rest. */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-sand-deep bg-white print:hidden">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Purchase date</th>
              <th className="px-4 py-2">Booking code</th>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Trip date</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Commission</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 text-ink-soft">{r.created_at.slice(0, 10)}</td>
                <td className="px-4 py-2 font-mono text-xs text-ink">{r.booking_code}</td>
                <td className="px-4 py-2 text-ink">{r.products?.title ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{r.slot_date}</td>
                <td className="px-4 py-2 text-ink-soft">{formatIdr(r.total_idr)}</td>
                <td className="px-4 py-2 font-semibold text-ink">
                  {r.commission_amount_usd != null
                    ? formatCommissionAmount(r.commission_amount_usd)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-ink-soft">
                  {r.commission_status === "paid" ? "Paid" : "Pending"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/agent/bookings/${r.id}`} className="text-sm font-semibold text-teal hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !error && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-soft">
                  No sales match this filter yet.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-sand-deep font-semibold">
                <td colSpan={5} className="px-4 py-2 text-right text-ink-soft">
                  Total
                </td>
                <td className="px-4 py-2 text-ink">{formatCommissionAmount(totalCommissionUsd)}</td>
                <td className="px-4 py-2" colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Print/PDF: every column, since a printout is a record meant
          to be complete on its own, not something you click through. */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border border-sand-deep bg-white print:block">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Purchase date</th>
              <th className="px-4 py-2">Booking code</th>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Trip date</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Hotel</th>
              <th className="px-4 py-2">Room</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Commission</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 text-ink-soft">{r.created_at.slice(0, 10)}</td>
                <td className="px-4 py-2 font-mono text-xs text-ink">{r.booking_code}</td>
                <td className="px-4 py-2 text-ink">{r.products?.title ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{r.slot_date}</td>
                <td className="px-4 py-2 text-ink">{r.customers?.name ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{r.hotel_name ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{r.room_number ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{formatIdr(r.total_idr)}</td>
                <td className="px-4 py-2 font-semibold text-ink">
                  {r.commission_amount_usd != null
                    ? formatCommissionAmount(r.commission_amount_usd)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-ink-soft">
                  {r.commission_status === "paid" ? "Paid" : "Pending"}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-sand-deep font-semibold">
                <td colSpan={8} className="px-4 py-2 text-right text-ink-soft">
                  Total
                </td>
                <td className="px-4 py-2 text-ink">{formatCommissionAmount(totalCommissionUsd)}</td>
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
