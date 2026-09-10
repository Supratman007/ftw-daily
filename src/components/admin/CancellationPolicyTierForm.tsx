"use client";

import type { CancellationPolicyTier } from "@/lib/cancellations/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

interface CancellationPolicyTierFormProps {
  action: (formData: FormData) => void | Promise<void>;
  tier?: CancellationPolicyTier;
  error?: string;
}

export function CancellationPolicyTierForm({ action, tier, error }: CancellationPolicyTierFormProps) {
  return (
    <form action={action} className="mt-6 flex max-w-md flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="min_days_before_departure">
          Minimum days before departure
        </label>
        <input
          id="min_days_before_departure"
          name="min_days_before_departure"
          type="number"
          min={0}
          required
          defaultValue={tier?.min_days_before_departure ?? ""}
          placeholder="e.g. 2"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">
          A cancellation qualifies for this tier once it&apos;s made at least this many days
          before the trip date. Same-day or a no-show is always 0% -- no tier needed for that.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="refund_percent">
          Refund percent
        </label>
        <input
          id="refund_percent"
          name="refund_percent"
          type="number"
          step="0.01"
          min={0}
          max={100}
          required
          defaultValue={tier?.refund_percent ?? ""}
          placeholder="e.g. 90"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        {tier ? "Save changes" : "Add tier"}
      </button>
    </form>
  );
}
