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
  const [images, setImages] = useState<string[]>(
    vehicleType?.gallery_urls?.length
      ? vehicleType.gallery_urls
      : vehicleType?.image_url
        ? [vehicleType.image_url]
        : []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const supabase = createSupabaseBrowserClient();
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file);
      if (uploadErr) {
        setUploadError(`Couldn't upload ${file.name}: ${uploadErr.message}`);
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = "";
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
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
        <label className={labelClass} htmlFor="recommended_for">
          Recommended for (optional)
        </label>
        <input
          id="recommended_for"
          name="recommended_for"
          defaultValue={vehicleType?.recommended_for ?? ""}
          placeholder="e.g. Best for solo travelers & couples"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">
          A short highlight shown right under the photo -- keep it to one line.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={vehicleType?.description ?? ""}
          placeholder="What makes this option a good choice? Comfort, luggage space, boat type..."
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="features">
          Features (comma-separated, optional)
        </label>
        <input
          id="features"
          name="features"
          defaultValue={vehicleType?.features?.join(", ") ?? ""}
          placeholder="e.g. AC, Driver included, Life jackets provided"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Photos</label>
        <input type="file" accept="image/*" multiple onChange={handleFileChange} />
        {uploading && <p className="mt-1 text-xs text-ink-soft">Uploading…</p>}
        {uploadError && <p className="mt-1 text-xs text-coral-dark">{uploadError}</p>}
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {images.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-only tool, not worth Image's optimization pipeline here */}
                <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute -right-2 -top-2 rounded-full bg-coral px-1.5 text-xs text-white"
                >
                  ×
                </button>
                <input type="hidden" name="gallery_urls" value={url} />
              </div>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-ink-soft">
          The first photo is used as the thumbnail; customers see all of them once this option is
          selected.
        </p>
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
