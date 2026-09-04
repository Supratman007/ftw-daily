"use client";

import { useState } from "react";

interface VehicleDetailPanelProps {
  name: string;
  galleryUrls: string[];
  capacityLabel?: string | null;
  recommendedFor?: string | null;
  description?: string | null;
  features?: string[];
  /** A car/van/boat emoji fallback for when no photo's been uploaded
   * yet -- keeps the panel from looking broken rather than empty. */
  placeholderEmoji?: string;
}

/** The "convince the customer" panel shown under the photo-card picker
 * once a car/vehicle is selected -- a real photo gallery plus whatever
 * marketing copy the admin has filled in. The parent passes `key={id}`
 * (or similar) so switching the selection remounts this component
 * fresh, resetting which photo is showing without an effect. */
export function VehicleDetailPanel({
  name,
  galleryUrls,
  capacityLabel,
  recommendedFor,
  description,
  features = [],
  placeholderEmoji = "🚗",
}: VehicleDetailPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = galleryUrls[activeIndex] ?? null;

  return (
    <div className="overflow-hidden rounded-2xl border border-sand-deep bg-white">
      {activePhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- prototype-stage booking flow; Next/Image optimization is a later polish pass
        <img src={activePhoto} alt={name} className="h-48 w-full object-cover" />
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-sand text-5xl">
          {placeholderEmoji}
        </div>
      )}

      {galleryUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b border-sand-deep bg-sand p-2">
          {galleryUrls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`h-12 w-16 flex-shrink-0 overflow-hidden rounded border-2 ${
                i === activeIndex ? "border-coral" : "border-transparent opacity-70"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail strip, not worth Image's optimization pipeline here */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-serif text-lg font-semibold text-ink">{name}</p>
          {capacityLabel && <span className="text-xs text-ink-soft">{capacityLabel}</span>}
        </div>

        {recommendedFor && (
          <p className="mt-1 text-sm font-semibold text-teal">✨ {recommendedFor}</p>
        )}

        {description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        )}

        {features.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {features.map((f) => (
              <li
                key={f}
                className="rounded-full border border-sand-deep bg-sand px-2.5 py-1 text-xs text-ink"
              >
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
