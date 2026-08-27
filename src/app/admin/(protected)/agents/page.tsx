import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AGENT_STATUS_LABELS, type SalesAgent } from "@/lib/agents/types";
import { updateAgentStatusAction } from "./actions";

const selectClass =
  "rounded-lg border border-sand-deep px-2 py-1 text-sm outline-none focus:border-teal";

/** Sales Agents self-register at /agent/register with status='pending'
 * -- this is where that application actually gets reviewed and
 * approved (their referral link stays inactive until then), or
 * suspended later if needed. */
export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  await requireAdmin();
  const { error, updated } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data, error: loadError } = await supabase
    .from("sales_agents")
    .select("id, name, email, phone, referral_code, status, created_at")
    .order("created_at", { ascending: false });

  const agents = (data ?? []) as SalesAgent[];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Sales Agents</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Review applications and manage who has an active referral link.
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
      {loadError && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          Couldn&apos;t load agents: {loadError.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Referral code</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 font-medium text-ink">{a.name}</td>
                <td className="px-4 py-2 text-ink-soft">{a.email}</td>
                <td className="px-4 py-2 font-mono text-ink-soft">{a.referral_code}</td>
                <td colSpan={2} className="px-4 py-2">
                  <form
                    action={updateAgentStatusAction.bind(null, a.id)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <select name="status" defaultValue={a.status} className={selectClass}>
                      {Object.entries(AGENT_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg border border-teal px-3 py-1 text-xs font-semibold text-teal hover:bg-[#E3F2F1]"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {agents.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  No Sales Agent applications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
