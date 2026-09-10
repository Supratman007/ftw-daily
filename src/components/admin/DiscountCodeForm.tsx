"use client";

import { DISCOUNT_TYPE_LABELS, type DiscountCode } from "@/lib/discounts/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

interface DiscountCodeFormProps {
  action: (formData: FormData) => void | Promise<void>;
  discountCode?: DiscountCode;
  error?: string;
}

/** Formats a stored timestamptz as the yyyy-mm-dd a <input type="date">
 * expects -- expires_at has a time component we don't ask for or show. */
function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function DiscountCodeForm({ action, discountCode, error }: DiscountCodeFormProps) {
  return (
    <form action={action} className="mt-6 flex max-w-md flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="code">
          Code
        </label>
        <input
          id="code"
          name="code"
          required
          defaultValue={discountCode?.code ?? ""}
          placeholder="e.g. WELCOME10"
          className={`${inputClass} uppercase`}
          style={{ textTransform: "uppercase" }}
        />
        <p className="mt-1 text-xs text-ink-soft">
          Not case-sensitive when a customer types it at checkout.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="discount_type">
          Discount type
        </label>
        <select
          id="discount_type"
          name="discount_type"
          defaultValue={discountCode?.discount_type ?? "percent"}
          className={inputClass}
        >
          {Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="discount_value">
          Discount value
        </label>
        <input
          id="discount_value"
          name="discount_value"
          type="number"
          step="0.01"
          min={0}
          required
          defaultValue={discountCode?.discount_value ?? ""}
          placeholder="e.g. 10"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">
          A number, no % or $ sign — e.g. 10 means either &ldquo;10% off&rdquo; or &ldquo;$10
          off&rdquo; depending on the type above.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="max_uses">
          Maximum total uses
        </label>
        <input
          id="max_uses"
          name="max_uses"
          type="number"
          min={1}
          defaultValue={discountCode?.max_uses ?? ""}
          placeholder="Leave blank for unlimited"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="expires_at">
          Expires on
        </label>
        <input
          id="expires_at"
          name="expires_at"
          type="date"
          defaultValue={toDateInputValue(discountCode?.expires_at ?? null)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">Leave blank for a code that never expires.</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={discountCode?.active ?? true}
        />
        <label htmlFor="active" className="text-sm text-ink">
          Active — uncheck to turn this code off without deleting it
        </label>
      </div>

      {discountCode && (
        <p className="text-xs text-ink-soft">
          Used {discountCode.used_count} time{discountCode.used_count === 1 ? "" : "s"} so far.
        </p>
      )}

      <button
        type="submit"
        className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        {discountCode ? "Save changes" : "Create discount code"}
      </button>
    </form>
  );
}
