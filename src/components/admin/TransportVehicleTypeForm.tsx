"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  const [imageUrl, setImageUrl] = useState(vehicleType?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const supabase = createSupabaseBrowserClient();
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file);
    if (uploadErr) {
      setUploadError(`Couldn't upload ${file.name}: ${uploadErr.message}`);
    } else {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
    e.target.value = "";
  }

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
        <label className={labelClass}>Photo (optional, but customers see it before choosing)</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {uploading && <p className="mt-1 text-xs text-ink-soft">Uploading…</p>}
        {uploadError && <p className="mt-1 text-xs text-coral-dark">{uploadError}</p>}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- admin-only tool, not worth Image's optimization pipeline here
          <img src={imageUrl} alt="" className="mt-3 h-20 w-20 rounded-lg object-cover" />
        )}
        <input type="hidden" name="image_url" value={imageUrl} />
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
        disabled={uploading}
        className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {vehicleType ? "Save changes" : "Add vehicle/service type"}
      </button>
    </form>
  );
}
