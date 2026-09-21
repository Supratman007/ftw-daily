"use client";

import { useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * The homepage hero photo's upload widget, on /admin/settings. Same
 * "upload straight to Supabase Storage from the browser, submit the
 * resulting public URL as a hidden field" pattern as ProductForm's
 * gallery uploader -- reuses the product-images bucket (its "any
 * active admin can upload" RLS policy already covers this) under a
 * hero/ prefix rather than a new bucket, since this is the same kind
 * of admin-uploaded public photo.
 */
export function HeroImageUploader({ initialUrl }: { initialUrl: string | null }) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const supabase = createSupabaseBrowserClient();
    const path = `hero/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      setUploadError(`Couldn't upload ${file.name}: ${error.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div>
      <input type="hidden" name="hero_image_url" value={imageUrl ?? ""} />
      {imageUrl ? (
        <div className="relative mb-3 h-40 w-full max-w-sm overflow-hidden rounded-lg border border-sand-deep">
          <Image src={imageUrl} alt="Hero photo preview" fill unoptimized className="object-cover" />
        </div>
      ) : (
        <p className="mb-3 text-xs text-ink-soft">
          No photo set -- the homepage shows the default illustrated background.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-sand-deep bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-sand">
          {imageUrl ? "Replace photo" : "Upload photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {imageUrl && (
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            className="text-xs font-semibold text-coral-dark hover:underline"
          >
            Remove photo (use default illustration)
          </button>
        )}
      </div>
      {uploading && <p className="mt-1 text-xs text-ink-soft">Uploading…</p>}
      {uploadError && <p className="mt-1 text-xs text-coral-dark">{uploadError}</p>}
    </div>
  );
}
