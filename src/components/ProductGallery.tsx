"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * The product page's photo gallery -- previously just the single cover
 * photo, even though the admin already uploads a full set
 * (gallery_urls) for every product. Same click-a-thumbnail-to-swap
 * pattern as VehicleDetailPanel.tsx's Car Hire/Transport photo picker,
 * scaled up for a page hero instead of a booking-flow card.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;
  const active = images[activeIndex] ?? images[0];

  return (
    <div className="mb-6">
      {/* This is the product page's LCP element (the big above-the-fold
          hero photo), so preload tells the browser to start fetching it
          from <head> instead of discovering it mid-page.
          unoptimized: these are the raw files an admin uploaded
          (ProductForm.tsx doesn't resize them), which can be several
          MB straight off a phone -- large enough that Vercel's Image
          Optimization step was silently failing on some of them, even
          though the same URL loads fine unprocessed. See
          ProductCardImage.tsx for the full story. */}
      <div className="relative h-72 w-full overflow-hidden rounded-2xl sm:h-96">
        <Image
          src={active}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 896px"
          preload
          unoptimized
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                i === activeIndex ? "border-coral" : "border-transparent opacity-70"
              }`}
            >
              <Image src={url} alt="" fill sizes="96px" unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
