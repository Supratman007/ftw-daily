"use client";

import type { CommissionTier } from "@/lib/agents/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

interface CommissionTierFormProps {
  action: (formData: FormData) => void | Promise<void>;
  tier?: CommissionTier;
  error?: string;
}

export function CommissionTierForm({ action, tier, error }: CommissionTierFormProps) {
  return (
    <form action={action} className="mt-6 flex max-w-md flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="name">
          Tier name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={tier?.name ?? ""}
          placeholder="e.g. Growth"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="min_referrals">
          Minimum confirmed referrals
        </label>
        <input
          id="min_referrals"
          name="min_referrals"
          type="number"
          min={0}
          required
          defaultValue={tier?.min_referrals ?? ""}
          placeholder="e.g. 10"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">
          An agent qualifies for this tier once their lifetime confirmed (paid) referral count
          reaches this number. One tier should be 0, so every agent starts somewhere.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="commission_percent">
          Commission percent
        </label>
        <input
          id="commission_percent"
          name="commission_percent"
          type="number"
          step="0.01"
          min={0}
          max={100}
          required
          defaultValue={tier?.commission_percent ?? ""}
          placeholder="e.g. 8"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">
          A number, no % sign -- e.g. 8 means 8% of the booking total.
        </p>
      </div>

      <p className="text-xs text-ink-soft">
        Changing a rate only affects commission calculated on bookings from now on -- it never
        rewrites the commission already stamped on a past booking.
      </p>

      <button
        type="submit"
        className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        {tier ? "Save changes" : "Add tier"}
      </button>
    </form>
  );
}
