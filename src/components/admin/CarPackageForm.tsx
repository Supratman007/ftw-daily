"use client";

import { DEFAULT_CAR_DURATION_HOURS, type CarPackage } from "@/lib/cars/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

interface CarPackageFormProps {
  action: (formData: FormData) => void | Promise<void>;
  carPackage?: CarPackage;
  error?: string;
}

export function CarPackageForm({ action, carPackage, error }: CarPackageFormProps) {
  return (
    <form action={action} className="mt-6 flex max-w-md flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="duration_hours">
          Duration
        </label>
        <input
          id="duration_hours"
          name="duration_hours"
          type="number"
          min={1}
          max={24}
          required
          defaultValue={carPackage?.duration_hours ?? DEFAULT_CAR_DURATION_HOURS}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">In hours, e.g. 4, 6, 8, 10, 12.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="overtime_rate_per_hour_idr">
          Overtime rate (IDR per hour)
        </label>
        <input
          id="overtime_rate_per_hour_idr"
          name="overtime_rate_per_hour_idr"
          type="number"
          min={0}
          step={1000}
          required
          defaultValue={carPackage?.overtime_rate_per_hour_idr ?? ""}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">
          Settled in cash directly with the driver if the trip runs over -- never billed through
          the app.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={carPackage?.status ?? "active"} className={inputClass}>
          <option value="active">Active — shown as an option</option>
          <option value="inactive">Inactive — hidden</option>
        </select>
      </div>

      <button
        type="submit"
        className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        {carPackage ? "Save changes" : "Add duration package"}
      </button>
    </form>
  );
}
