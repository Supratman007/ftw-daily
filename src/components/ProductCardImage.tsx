"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";

/**
 * A card's cover photo -- falls back to the same "Photo coming soon"
 * placeholder both when there's no URL at all AND when the URL is
 * there but the image itself fails to load. `unoptimized` is the real
 * fix, not a fallback: admin-uploaded photos are the raw file the
 * admin picked (ProductForm.tsx uploads it as-is, no client-side
 * resizing), which can easily be several MB straight off a phone --
 * Vercel's Image Optimization step (what next/image normally routes
 * through to resize/recompress a remote image) has its own size/time
 * limits and was silently failing on exactly these, even though the
 * same URL loads fine as a plain, unprocessed <img> (confirmed by the
 * admin form's own photo previews, and by VehicleDetailPanel's
 * thumbnail strip, which already uses a plain <img> for the same
 * reason). `unoptimized` skips that step and serves the original file
 * directly, the same path that's already proven to work -- the
 * onError fallback stays as a backstop for a genuinely broken/missing
 * file, not the size issue this was actually hitting.
 */
export function ProductCardImage({
  src,
  alt,
  sizes,
  comingSoonLabel,
  className = "h-40",
}: {
  src: string | null;
  alt: string;
  sizes: string;
  comingSoonLabel: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <PhotoPlaceholder label={comingSoonLabel} className={className} />;
  }

  return (
    <div className={`relative w-full ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} unoptimized className="object-cover" onError={() => setFailed(true)} />
    </div>
  );
}
