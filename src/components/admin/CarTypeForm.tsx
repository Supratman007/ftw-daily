"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_CAR_CAPACITY_TIER, type CarType } from "@/lib/cars/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

interface CarTypeFormProps {
  action: (formData: FormData) => void | Promise<void>;
  carType?: CarType;
  error?: string;
}

export function CarTypeForm({ action, carType, error }: CarTypeFormProps) {
  const [images, setImages] = useState<string[]>(
    carType?.gallery_urls?.length ? carType.gallery_urls : carType?.image_url ? [carType.image_url] : []
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
          Car model / name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={carType?.name ?? ""}
          placeholder="e.g. Toyota Avanza"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="capacity_tier">
          Seats
        </label>
        <input
          id="capacity_tier"
          name="capacity_tier"
          type="number"
          min={1}
          required
          defaultValue={carType?.capacity_tier ?? DEFAULT_CAR_CAPACITY_TIER}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-soft">
          Above 6 seats legally needs a licensed guide under Indonesian regulation -- make sure
          you can operate it properly before adding a bigger car.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="recommended_for">
          Recommended for (optional)
        </label>
        <input
          id="recommended_for"
          name="recommended_for"
          defaultValue={carType?.recommended_for ?? ""}
          placeholder="e.g. Best for couples & small families"
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
          defaultValue={carType?.description ?? ""}
          placeholder="What makes this car a good choice? Comfort, luggage space, road type it's suited for..."
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
          defaultValue={carType?.features?.join(", ") ?? ""}
          placeholder="e.g. AC, Driver included, Bluetooth"
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
          The first photo is used as the thumbnail; customers see all of them once this car is
          selected.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={carType?.status ?? "active"} className={inputClass}>
          <option value="active">Active — shown as an option</option>
          <option value="inactive">Inactive — hidden</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {carType ? "Save changes" : "Add car type"}
      </button>
    </form>
  );
}
