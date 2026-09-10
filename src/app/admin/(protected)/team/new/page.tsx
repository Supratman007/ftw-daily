import { requireSuperAdmin, ADMIN_ROLE_LABELS } from "@/lib/admin/auth";
import { inviteStaffAction } from "../actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

export default async function NewStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Invite staff</h1>
      <p className="mt-1 text-sm text-ink-soft">
        They&apos;ll get an email with a link to set their own password.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <form action={inviteStaffAction} className="mt-6 flex max-w-sm flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="name">
            Full name
          </label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="role">
            Role
          </label>
          <select id="role" name="role" defaultValue="support" className={inputClass}>
            {Object.entries(ADMIN_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Send invite
        </button>
      </form>
    </div>
  );
}
