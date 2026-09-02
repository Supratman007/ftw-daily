"use client";

import type { TransportVehicleType } from "@/lib/cars/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

interface TransportVehicleTypeFormProps {
  action: (formData: FormData) => void | Promise<void>;
  vehicleType?: TransportVehicleType;
  error?: string;
}

export function TransportVehicleTypeForm({ action, vehicleType, error }: TransportVehicleTypeFormProps) {
  return (
    <form action={action} className="mt-6 flex max-w-md flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="name">
          Vehicle / service name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={vehicleType?.name ?? ""}
          placeholder="e.g. Sedan, Van, Private Speedboat"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="capacity_note">
          Capacity note (optional)
        </label>
        <input
          id="capacity_note"
          name="capacity_note"
          defaultValue={vehicleType?.capacity_note ?? ""}
          placeholder="e.g. Up to 4 passengers, or Up to 10 passengers"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="status">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={vehicleType?.status ?? "active"}
          className={inputClass}
        >
          <option value="active">Active — shown as an option</option>
          <option value="inactive">Inactive — hidden</option>
        </select>
      </div>

      <button
        type="submit"
        className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        {vehicleType ? "Save changes" : "Add vehicle/service type"}
      </button>
    </form>
  );
}
