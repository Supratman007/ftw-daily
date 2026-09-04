"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PRODUCT_TYPE_LABELS, type Product, type ProductType } from "@/lib/products/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

interface ProductFormProps {
  action: (formData: FormData) => void | Promise<void>;
  product?: Product;
  error?: string;
}

export function ProductForm({ action, product, error }: ProductFormProps) {
  const [images, setImages] = useState<string[]>(product?.gallery_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [productType, setProductType] = useState<ProductType>(product?.product_type ?? "tour");
  const isCarOrTransport = productType === "car_hire" || productType === "transport";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const supabase = createSupabaseBrowserClient();
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, file);
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
    <form action={action} className="mt-6 flex max-w-2xl flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="product_type">
          Product type
        </label>
        <select
          id="product_type"
          name="product_type"
          value={productType}
          onChange={(e) => setProductType(e.target.value as ProductType)}
          className={inputClass}
        >
          {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {isCarOrTransport && product && (
          <p className="mt-2 text-xs text-ink-soft">
            Pricing for Car Hire / Transport is set on its own grid, not the single price below.{" "}
            <Link
              href={
                productType === "car_hire"
                  ? `/admin/products/${product.id}/car-pricing`
                  : `/admin/products/${product.id}/transport-pricing`
              }
              className="font-semibold text-teal underline"
            >
              Manage {productType === "car_hire" ? "car types & pricing" : "transport pricing"} →
            </Link>
          </p>
        )}
        {isCarOrTransport && !product && (
          <p className="mt-2 text-xs text-ink-soft">
            Save this product first, then a link to set up its pricing grid will appear here.
          </p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={product?.title ?? ""}
          className={inputClass}
          onChange={(e) => {
            if (!slugTouched) {
              setSlug(
                e.target.value
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "")
              );
            }
          }}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="slug">
          URL slug
        </label>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          placeholder="auto-filled from the title"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="excerpt">
          Short summary
        </label>
        <input
          id="excerpt"
          name="excerpt"
          defaultValue={product?.excerpt ?? ""}
          placeholder="One line shown on the listing card"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Full description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={product?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={product?.location ?? ""}
            placeholder="e.g. Gili Trawangan, Meno & Air"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="category">
            Category
          </label>
          <input
            id="category"
            name="category"
            defaultValue={product?.category ?? ""}
            placeholder="e.g. Snorkeling"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="duration_label">
          Duration
        </label>
        <input
          id="duration_label"
          name="duration_label"
          defaultValue={product?.duration_label ?? ""}
          placeholder="e.g. 8 Hours, or 4 Days 3 Nights"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="adult_price_usd">
            Adult price (USD)
          </label>
          <input
            id="adult_price_usd"
            name="adult_price_usd"
            type="number"
            step="0.01"
            required={!isCarOrTransport}
            defaultValue={product?.adult_price_usd ?? ""}
            placeholder={isCarOrTransport ? "Not used -- see pricing grid" : undefined}
            className={inputClass}
          />
          {isCarOrTransport && (
            <p className="mt-1 text-xs text-ink-soft">Leave blank -- priced by the grid instead.</p>
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="child_price_usd">
            Child price (USD)
          </label>
          <input
            id="child_price_usd"
            name="child_price_usd"
            type="number"
            step="0.01"
            defaultValue={product?.child_price_usd ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="infant_price_usd">
            Infant price (USD)
          </label>
          <input
            id="infant_price_usd"
            name="infant_price_usd"
            type="number"
            step="0.01"
            defaultValue={product?.infant_price_usd ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="capacity_per_date">
          Max people per date
        </label>
        <input
          id="capacity_per_date"
          name="capacity_per_date"
          type="number"
          min={1}
          defaultValue={product?.capacity_per_date ?? ""}
          placeholder="Leave blank for unlimited"
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
        <p className="mt-1 text-xs text-ink-soft">The first photo is used as the cover image.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="source_url">
          Link to page on adventure-lombok.com (optional)
        </label>
        <input
          id="source_url"
          name="source_url"
          type="url"
          defaultValue={product?.source_url ?? ""}
          placeholder="https://adventure-lombok.com/..."
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_bookable"
          name="is_bookable"
          type="checkbox"
          defaultChecked={product?.is_bookable ?? true}
        />
        <label htmlFor="is_bookable" className="text-sm text-ink">
          Instantly bookable &amp; payable online (uncheck for something that needs manual
          confirmation, like Rinjani)
        </label>
      </div>

      <div>
        <label className={labelClass} htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={product?.status ?? "active"} className={inputClass}>
          <option value="active">Active — shows on the site once the catalog is built</option>
          <option value="inactive">Inactive — hidden</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
