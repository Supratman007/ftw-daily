/**
 * Downscales and re-compresses an image file entirely in the browser,
 * before it ever reaches Supabase Storage -- an admin photo straight
 * off a phone can easily be several MB at 4000px+, and every admin
 * upload flow in this app (product/vehicle photos, the homepage hero)
 * used to upload that raw file as-is. That's also *why* next/image's
 * optimizer got turned off for these photos elsewhere in the app (see
 * ProductCardImage.tsx's `unoptimized` comment) -- it was timing out
 * on exactly these oversized originals. Shrinking at upload time fixes
 * the actual problem (huge files) rather than routing around it.
 *
 * Caps the longest edge at `maxDimension` (2000px default -- comfortably
 * larger than this site ever displays a single photo, including a
 * full-bleed hero) and re-encodes as JPEG at `quality`. Every failure
 * mode (unsupported format, a browser that can't decode this file,
 * canvas unavailable) falls back to returning the original file
 * unchanged rather than blocking the upload -- compression is a
 * nice-to-have, a failed upload isn't.
 */
export async function compressImageFile(
  file: File,
  { maxDimension = 2000, quality = 0.82 }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  // SVGs and non-image files pass through untouched -- there's nothing
  // to raster-compress, and product/vehicle photos are never SVGs.
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Re-encoding as JPEG drops any alpha channel -- fine for a real
  // photograph (every use of this helper is a product/vehicle/hero
  // photo, never a transparent graphic or logo).
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;

  // An already-small, already-compressed photo can come out slightly
  // larger after a fresh JPEG re-encode -- keep whichever file is
  // actually smaller instead of always trusting the compressed one.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
