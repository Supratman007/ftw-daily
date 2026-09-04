import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCommissionAmount } from "@/lib/agents/commission";
import { setCommissionStatusAction, markAgentCommissionsPaidAction } from "./actions";
import type { CommissionStatus } from "@/lib/agents/types";

type Source = "booking" | "gift_voucher";

type LedgerRow = {
  id: string;
  source: Source;
  code: string;
  tripTitle: string;
  commission_amount_usd: number | null;
  commission_status: CommissionStatus | null;
  created_at: string;
};

type AgentInfo = {
  id: string;
  name: string;
  referral_code: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
};

type AgentGroup = {
  agentId: string;
  agentName: string;
  referralCode: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  pendingUsd: number;
  paidUsd: number;
  rows: LedgerRow[];
};

/**
 * Sales Agent Stage 4's other half (with tiers at ./tiers): where an
 * admin actually settles what's owed. Every referred + paid_confirmed
 * booking with a commission stamped on it (Stage 2's webhook), plus --
 * since a gift voucher purchase (spec §6f follow-up) can carry a
 * referral too now -- every issued gift voucher with one, grouped by
 * agent the same way either source. A real payout is one bank transfer
 * covering everything an agent is owed, not row-by-row, so the primary
 * action is "Mark all pending paid" per agent, right next to their
 * bank details (from the Profile tab, §6l) so there's nowhere else to
 * look before sending the wire. Agents owed money sort first.
 */
export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  await requireAdmin();
  const { error, updated } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const [{ data: bookingData }, { data: voucherData }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, booking_code, commission_amount_usd, commission_status, created_at, products(title), sales_agents(id, name, referral_code, bank_name, bank_account_number, bank_account_holder)"
      )
      .not("referred_by_agent_id", "is", null)
      .eq("status", "paid_confirmed")
      .order("created_at", { ascending: false }),
    supabase
      .from("gift_vouchers")
      .select(
        "id, redemption_code, commission_amount_usd, commission_status, issued_at, products(title), sales_agents(id, name, referral_code, bank_name, bank_account_number, bank_account_holder)"
      )
      .not("referred_by_agent_id", "is", null)
      .eq("status", "issued")
      .order("issued_at", { ascending: false }),
  ]);

  const groupsByAgent = new Map<string, AgentGroup>();

  function addRow(agent: AgentInfo | null, row: LedgerRow) {
    if (!agent) return; // shouldn't happen (FK), but keeps this safe
    let group = groupsByAgent.get(agent.id);
    if (!group) {
      group = {
        agentId: agent.id,
        agentName: agent.name,
        referralCode: agent.referral_code,
        bankName: agent.bank_name,
        bankAccountNumber: agent.bank_account_number,
        bankAccountHolder: agent.bank_account_holder,
        pendingUsd: 0,
        paidUsd: 0,
        rows: [],
      };
      groupsByAgent.set(agent.id, group);
    }
    const amount = row.commission_amount_usd ?? 0;
    if (row.commission_status === "paid") group.paidUsd += amount;
    else group.pendingUsd += amount;
    group.rows.push(row);
  }

  for (const b of (bookingData ?? []) as unknown as Array<{
    id: string;
    booking_code: string;
    commission_amount_usd: number | null;
    commission_status: CommissionStatus | null;
    created_at: string;
    products: { title: string } | null;
    sales_agents: AgentInfo | null;
  }>) {
    addRow(b.sales_agents, {
      id: b.id,
      source: "booking",
      code: b.booking_code,
      tripTitle: b.products?.title ?? "—",
      commission_amount_usd: b.commission_amount_usd,
      commission_status: b.commission_status,
      created_at: b.created_at,
    });
  }

  for (const v of (voucherData ?? []) as unknown as Array<{
    id: string;
    redemption_code: string;
    commission_amount_usd: number | null;
    commission_status: CommissionStatus | null;
    issued_at: string;
    products: { title: string } | null;
    sales_agents: AgentInfo | null;
  }>) {
    addRow(v.sales_agents, {
      id: v.id,
      source: "gift_voucher",
      code: v.redemption_code,
      tripTitle: v.products?.title ?? "—",
      commission_amount_usd: v.commission_amount_usd,
      commission_status: v.commission_status,
      created_at: v.issued_at,
    });
  }

  for (const group of groupsByAgent.values()) {
    group.rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const groups = [...groupsByAgent.values()].sort((a, b) => b.pendingUsd - a.pendingUsd);
  const totalPendingUsd = groups.reduce((sum, g) => sum + g.pendingUsd, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Commissions</h1>
        <Link
          href="/admin/commissions/tiers"
          className="rounded-lg border border-sand-deep px-4 py-2 text-sm font-semibold text-ink hover:bg-sand"
        >
          Edit tier rates
        </Link>
      </div>

      <p className="mt-1 text-sm text-ink-soft">
        Total pending across all agents: <span className="font-semibold text-ink">{formatCommissionAmount(totalPendingUsd)}</span>
      </p>

      {updated && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Updated.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      {groups.length === 0 && (
        <p className="mt-6 rounded-lg border border-sand-deep bg-white p-4 text-sm text-ink-soft">
          No commission-bearing bookings or gift vouchers yet.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {groups.map((g) => (
          <div key={g.agentId} className="rounded-2xl border border-sand-deep bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-serif text-lg font-semibold text-ink">
                  {g.agentName} <span className="font-mono text-sm text-ink-soft">({g.referralCode})</span>
                </p>
                {g.bankName ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    {g.bankName} · {g.bankAccountNumber} · {g.bankAccountHolder}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-coral-dark">No bank account on file yet.</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-ink-soft">Pending</p>
                <p className="font-serif text-xl font-semibold text-ink">
                  {formatCommissionAmount(g.pendingUsd)}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Paid to date: {formatCommissionAmount(g.paidUsd)}
                </p>
              </div>
            </div>

            {g.pendingUsd > 0 && (
              <form action={markAgentCommissionsPaidAction.bind(null, g.agentId)} className="mt-4">
                <button
                  type="submit"
                  className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
                >
                  Mark all pending paid ({formatCommissionAmount(g.pendingUsd)})
                </button>
              </form>
            )}

            <div className="mt-4 overflow-x-auto rounded-lg border border-sand-deep">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-sand text-xs uppercase text-ink-soft">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Trip</th>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">Commission</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={`${r.source}-${r.id}`} className="border-t border-sand-deep">
                      <td className="px-4 py-2 text-ink-soft">{r.created_at.slice(0, 10)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-ink">{r.code}</td>
                      <td className="px-4 py-2 text-ink">{r.tripTitle}</td>
                      <td className="px-4 py-2 text-ink-soft">
                        {r.source === "booking" ? "Booking" : "Gift voucher"}
                      </td>
                      <td className="px-4 py-2 font-semibold text-ink">
                        {r.commission_amount_usd != null
                          ? formatCommissionAmount(r.commission_amount_usd)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-ink-soft">
                        {r.commission_status === "paid" ? "Paid" : "Pending"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <form
                          action={setCommissionStatusAction.bind(
                            null,
                            r.id,
                            r.source,
                            r.commission_status === "paid" ? "pending" : "paid"
                          )}
                        >
                          <button type="submit" className="text-sm font-semibold text-teal hover:underline">
                            {r.commission_status === "paid" ? "Mark pending" : "Mark paid"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
