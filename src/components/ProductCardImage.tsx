"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";

/**
 * A card's cover photo -- falls back to the same "Photo coming soon"
 * placeholder both when there's no URL at all AND when the URL is
 * there but the image itself fails to load (a broken/expired Storage
 * link, say). Before this, a broken load just rendered as a blank
 * white box (next/image with `alt=""` shows nothing on error, not
 * even a broken-image icon), which looked identical to "the photos
 * aren't showing" being a real bug even on cards that DO have a photo
 * set -- this makes the two cases (no photo yet vs. a real load
 * failure) at least LOOK the same known-placeholder way instead of an
 * unexplained blank, since telling them apart needs the actual URL
 * from the database, not something visible in the browser.
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
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} />
    </div>
  );
}
