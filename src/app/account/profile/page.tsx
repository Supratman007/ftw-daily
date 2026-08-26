import { requireCustomer } from "@/lib/customers/auth";
import { updateProfileAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

/** Spec §6h Profile, Phase 1 slice: "name, email, phone" -- language
 * preference (Phase 3 i18n) and saved trekking documents (Phase 2,
 * depends on Rinjani's document upload) come later. */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const customer = await requireCustomer("/account/profile");
  const { error, saved } = await searchParams;

  return (
    <div className="max-w-md">
      <h1 className="font-serif text-2xl font-semibold text-ink">Profile</h1>

      {saved && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Profile updated.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <form action={updateProfileAction} className="mt-6 flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={customer.name}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input value={customer.email} disabled className={`${inputClass} bg-sand text-ink-soft`} />
          <p className="mt-1 text-xs text-ink-soft">Contact us to change your email address.</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" defaultValue={customer.phone ?? ""} className={inputClass} />
        </div>
        <button
          type="submit"
          className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
