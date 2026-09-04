import Link from "next/link";
import { requireSuperAdmin, ADMIN_ROLE_LABELS, type AdminUser } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateStaffAction } from "./actions";

const selectClass =
  "rounded-lg border border-sand-deep px-2 py-1 text-sm outline-none focus:border-teal";

/** Spec §6k: "Super Admin -- Everything, including managing other admin
 * accounts and their roles." The narrower roles (Reservations/
 * Accounting/Support) aren't enforced against specific routes yet per
 * spec's own phasing ("build it in once there's an actual second admin
 * account to apply it to") -- this screen is what makes that second
 * account possible to create in the first place. */
export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invited?: string; updated?: string }>;
}) {
  const currentAdmin = await requireSuperAdmin();
  const { error, invited, updated } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data, error: loadError } = await supabase
    .from("admin_users")
    .select("id, name, email, role, status")
    .order("role", { ascending: true });

  const staff = (data ?? []) as AdminUser[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Team</h1>
        <Link
          href="/admin/team/new"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          + Invite staff
        </Link>
      </div>

      {invited && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Invite sent — they&apos;ll get an email to set their password.
        </p>
      )}
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
          Couldn&apos;t load the team: {loadError.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const isSelf = s.id === currentAdmin.id;
              return (
                <tr key={s.id} className="border-t border-sand-deep">
                  <td className="px-4 py-2 font-medium text-ink">
                    {s.name} {isSelf && <span className="text-xs text-ink-soft">(you)</span>}
                  </td>
                  <td className="px-4 py-2 text-ink-soft">{s.email}</td>
                  {isSelf ? (
                    <>
                      <td className="px-4 py-2 text-ink">{ADMIN_ROLE_LABELS[s.role]}</td>
                      <td className="px-4 py-2 text-ink">
                        {s.status === "active" ? "Active" : "Suspended"}
                      </td>
                      <td className="px-4 py-2" />
                    </>
                  ) : (
                    <>
                      <td colSpan={3} className="px-4 py-2">
                        <form
                          action={updateStaffAction.bind(null, s.id)}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <select name="role" defaultValue={s.role} className={selectClass}>
                            {Object.entries(ADMIN_ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <select name="status" defaultValue={s.status} className={selectClass}>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg border border-teal px-3 py-1 text-xs font-semibold text-teal hover:bg-[#E3F2F1]"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {staff.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  No staff accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
