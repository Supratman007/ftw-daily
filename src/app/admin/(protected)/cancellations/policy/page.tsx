import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteCancellationPolicyTierAction } from "./actions";
import type { CancellationPolicyTier } from "@/lib/cancellations/types";

export default async function AdminCancellationPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; deleted?: string }>;
}) {
  await requireAdmin();
  const { error, saved, deleted } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cancellation_policy_tiers")
    .select("id, min_days_before_departure, refund_percent")
    .order("min_days_before_departure", { ascending: true });
  const tiers = (data ?? []) as CancellationPolicyTier[];

  return (
    <div>
      <Link href="/admin/cancellations" className="text-sm font-semibold text-teal hover:underline">
        ← Back to cancellations
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Cancellation refund policy</h1>
        <Link
          href="/admin/cancellations/policy/new"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          + Add tier
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Standard cancellations only -- force majeure always bypasses this and is reviewed
        manually. Same-day or a no-show is always 0% refund; nothing to configure for that.
      </p>

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
              <th className="px-4 py-2">Cancelled at least</th>
              <th className="px-4 py-2">Refund</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 font-semibold text-ink">
                  {t.min_days_before_departure} day{t.min_days_before_departure === 1 ? "" : "s"}{" "}
                  before departure
                </td>
                <td className="px-4 py-2 text-ink">{t.refund_percent}%</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/cancellations/policy/${t.id}/edit`}
                    className="text-sm font-semibold text-teal hover:underline"
                  >
                    Edit
                  </Link>
                  <form
                    action={deleteCancellationPolicyTierAction.bind(null, t.id)}
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
                <td colSpan={3} className="px-4 py-8 text-center text-ink-soft">
                  No tiers yet -- every standard cancellation refunds 0% until at least one exists.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
