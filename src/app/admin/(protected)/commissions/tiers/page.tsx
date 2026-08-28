import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteCommissionTierAction } from "./actions";
import type { CommissionTier } from "@/lib/agents/types";

/**
 * Sales Agent Stage 4: rates were seeded once in migration 0009
 * (Starter/Growth/Elite at 5/8/12%) with no screen to change them
 * afterward. This is that screen -- ordered by min_referrals, since
 * that's what actually determines tier order (resolveCommissionTier
 * sorts by it directly; sort_order is just kept in sync for display).
 */
export default async function AdminCommissionTiersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; deleted?: string }>;
}) {
  await requireAdmin();
  const { error, saved, deleted } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("commission_tiers")
    .select("id, name, min_referrals, commission_percent, sort_order")
    .order("min_referrals", { ascending: true });
  const tiers = (data ?? []) as CommissionTier[];

  return (
    <div>
      <Link href="/admin/commissions" className="text-sm font-semibold text-teal hover:underline">
        ← Back to commissions
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Commission tiers</h1>
        <Link
          href="/admin/commissions/tiers/new"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          + Add tier
        </Link>
      </div>

      {saved && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Tier saved.
        </p>
      )}
      {deleted && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Tier deleted.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">Qualifies at</th>
              <th className="px-4 py-2">Commission</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 font-semibold text-ink">{t.name}</td>
                <td className="px-4 py-2 text-ink-soft">{t.min_referrals}+ referrals</td>
                <td className="px-4 py-2 text-ink">{t.commission_percent}%</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/commissions/tiers/${t.id}/edit`}
                    className="text-sm font-semibold text-teal hover:underline"
                  >
                    Edit
                  </Link>
                  <form
                    action={deleteCommissionTierAction.bind(null, t.id)}
                    className="ml-3 inline"
                  >
                    <button type="submit" className="text-sm font-semibold text-coral-dark hover:underline">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {tiers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                  No tiers yet -- every agent earns nothing until at least one exists at 0
                  referrals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
