import { requireCustomer } from "@/lib/customers/auth";
import { updateProfileAction, changePasswordAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

/** Spec §6h Profile, Phase 1 slice: "name, email, phone" -- language
 * preference (Phase 3 i18n) and saved trekking documents (Phase 2,
 * depends on Rinjani's document upload) come later. Change-password
 * isn't in spec §6h, but belongs on this same screen alongside the
 * rest of account settings. */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; password_error?: string; password_saved?: string }>;
}) {
  const customer = await requireCustomer("/account/profile");
  const { error, saved, password_error: passwordError, password_saved: passwordSaved } = await searchParams;

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

      <div className="my-8 h-px bg-sand-deep" />

      <h2 className="font-serif text-xl font-semibold text-ink">Security</h2>
      <p className="mt-1 text-sm text-ink-soft">Change your password.</p>

      {passwordSaved && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Password updated.
        </p>
      )}
      {passwordError && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {passwordError}
        </p>
      )}

      <form action={changePasswordAction} className="mt-6 flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="current_password">
            Current password
          </label>
          <input
            id="current_password"
            name="current_password"
            type="password"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="new_password">
            New password
          </label>
          <input
            id="new_password"
            name="new_password"
            type="password"
            required
            minLength={6}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="confirm_password">
            Confirm new password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={6}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="mt-2 self-start rounded-lg border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-[#E3F2F1]"
        >
          Update password
        </button>
      </form>
    </div>
  );
}
