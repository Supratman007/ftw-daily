import { requireAgent } from "@/lib/agents/auth";
import { AGENT_TYPE_LABELS } from "@/lib/agents/types";
import {
  updateAgentContactAction,
  requestBankChangeAction,
  cancelBankChangeAction,
  changeAgentPasswordAction,
} from "./actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";
const noticeClass = "mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal";
const errorClass = "mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark";

const BANK_CHANGE_EXPIRY_HOURS = 24;

function maskAccountNumber(value: string | null): string {
  if (!value) return "Not set";
  return value.length > 4 ? `•••• ${value.slice(-4)}` : value;
}

/**
 * Spec §6l (Agent business profile) + §6j (change password): business
 * details, the payout bank account (with the email-confirm speed bump
 * §6l recommends), and Security -- the one screen every other agent
 * dashboard page was missing entirely before this.
 */
export default async function AgentProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    bank_requested?: string;
    bank_confirmed?: string;
    bank_cancelled?: string;
    password_error?: string;
    password_saved?: string;
  }>;
}) {
  const agent = await requireAgent();
  const {
    error,
    saved,
    bank_requested: bankRequested,
    bank_confirmed: bankConfirmed,
    bank_cancelled: bankCancelled,
    password_error: passwordError,
    password_saved: passwordSaved,
  } = await searchParams;

  const bankChangePending =
    !!agent.bank_change_requested_at &&
    new Date().getTime() - new Date(agent.bank_change_requested_at).getTime() <
      BANK_CHANGE_EXPIRY_HOURS * 60 * 60 * 1000;

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold text-ink">Profile</h1>

      {error && <p className={errorClass}>{error}</p>}

      {/* Business details */}
      <h2 className="mt-8 font-serif text-xl font-semibold text-ink">Business details</h2>
      {saved && <p className={noticeClass}>Your details have been saved.</p>}

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-sand-deep bg-white p-4 text-sm">
        <div>
          <p className={labelClass}>Name</p>
          <p className="text-ink">{agent.name}</p>
        </div>
        <div>
          <p className={labelClass}>Agent type</p>
          <p className="text-ink">{AGENT_TYPE_LABELS[agent.agent_type]}</p>
        </div>
        <div>
          <p className={labelClass}>Email</p>
          <p className="text-ink">{agent.email}</p>
        </div>
        <div>
          <p className={labelClass}>Referral code</p>
          <p className="font-mono text-ink">{agent.referral_code}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Contact us to change your name or email address.
      </p>

      <form action={updateAgentContactAction} className="mt-4 flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" defaultValue={agent.phone ?? ""} className={inputClass} />
        </div>

        {agent.agent_type === "business" && (
          <>
            <div>
              <label className={labelClass} htmlFor="pic_name">
                PIC name
              </label>
              <input
                id="pic_name"
                name="pic_name"
                defaultValue={agent.pic_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pic_phone">
                PIC phone
              </label>
              <input
                id="pic_phone"
                name="pic_phone"
                defaultValue={agent.pic_phone ?? ""}
                className={inputClass}
              />
            </div>
          </>
        )}

        <button
          type="submit"
          className="self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Save details
        </button>
      </form>

      <div className="my-8 h-px bg-sand-deep" />

      {/* Payout bank account */}
      <h2 className="font-serif text-xl font-semibold text-ink">Payout bank account</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Where we send your commission. Changing this requires confirming via email before it
        takes effect.
      </p>

      {bankConfirmed && <p className={noticeClass}>Your bank account change has been confirmed.</p>}
      {bankCancelled && <p className={noticeClass}>Pending bank account change cancelled.</p>}

      <div className="mt-4 rounded-lg border border-sand-deep bg-white p-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={labelClass}>Bank</p>
            <p className="text-ink">{agent.bank_name ?? "Not set"}</p>
          </div>
          <div>
            <p className={labelClass}>Account number</p>
            <p className="font-mono text-ink">{maskAccountNumber(agent.bank_account_number)}</p>
          </div>
          <div className="col-span-2">
            <p className={labelClass}>Account holder</p>
            <p className="text-ink">{agent.bank_account_holder ?? "Not set"}</p>
          </div>
        </div>
      </div>

      {bankChangePending ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-coral bg-[#FCE6DD] p-4 text-sm text-coral-dark">
          <p>
            A bank account change is pending -- check your email for the confirmation link. It
            expires {BANK_CHANGE_EXPIRY_HOURS} hours after you requested it.
          </p>
          <form action={cancelBankChangeAction}>
            <button type="submit" className="ml-4 shrink-0 font-semibold underline">
              Cancel
            </button>
          </form>
        </div>
      ) : (
        <>
          {bankRequested && (
            <p className={noticeClass}>
              Check your email to confirm this bank account change -- it won&apos;t take effect
              until you click the link.
            </p>
          )}
          <form action={requestBankChangeAction} className="mt-4 flex flex-col gap-4">
            <div>
              <label className={labelClass} htmlFor="bank_name">
                Bank name
              </label>
              <input id="bank_name" name="bank_name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bank_account_number">
                Account number
              </label>
              <input
                id="bank_account_number"
                name="bank_account_number"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="bank_account_holder">
                Account holder name
              </label>
              <input
                id="bank_account_holder"
                name="bank_account_holder"
                required
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="self-start rounded-lg border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-[#E3F2F1]"
            >
              {agent.bank_name ? "Change bank account" : "Add bank account"}
            </button>
          </form>
        </>
      )}

      <div className="my-8 h-px bg-sand-deep" />

      {/* Security */}
      <h2 className="font-serif text-xl font-semibold text-ink">Security</h2>
      <p className="mt-1 text-sm text-ink-soft">Change your password.</p>

      {passwordSaved && <p className={noticeClass}>Password updated.</p>}
      {passwordError && <p className={errorClass}>{passwordError}</p>}

      <form action={changeAgentPasswordAction} className="mt-4 flex flex-col gap-4">
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
          className="self-start rounded-lg border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-[#E3F2F1]"
        >
          Update password
        </button>
      </form>
    </div>
  );
}
