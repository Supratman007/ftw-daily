"use client";

import type { MeetingPoint } from "@/lib/cars/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

interface MeetingPointFormProps {
  action: (formData: FormData) => void | Promise<void>;
  meetingPoint?: MeetingPoint;
  error?: string;
}

export function MeetingPointForm({ action, meetingPoint, error }: MeetingPointFormProps) {
  return (
    <form action={action} className="mt-6 flex max-w-md flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={meetingPoint?.name ?? ""}
          placeholder="e.g. Senggigi"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="region">
          Region (optional)
        </label>
        <input
          id="region"
          name="region"
          defaultValue={meetingPoint?.region ?? ""}
          placeholder="e.g. West Lombok"
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
          defaultValue={meetingPoint?.status ?? "active"}
          className={inputClass}
        >
          <option value="active">Active — shown as a pickup option</option>
          <option value="inactive">Inactive — hidden</option>
        </select>
      </div>

      <button
        type="submit"
        className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        {meetingPoint ? "Save changes" : "Add meeting point"}
      </button>
    </form>
  );
}
