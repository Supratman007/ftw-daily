"use client";

import { useState } from "react";
import { CarHireBookingForm } from "@/components/CarHireBookingForm";
import { VehicleDetailPanel } from "@/components/VehicleDetailPanel";
import type { CarType, CarPackage, CarPackagePrice, MeetingPoint } from "@/lib/cars/types";

interface CarHireProductSectionProps {
  title: string;
  location: string | null;
  durationLabel: string | null;
  description: string | null;
  action: (formData: FormData) => void | Promise<void>;
  carTypes: CarType[];
  packages: CarPackage[];
  prices: CarPackagePrice[];
  meetingPoints: MeetingPoint[];
  defaultDiscountCode?: string;
  error?: string;
}

/**
 * Car Hire's product-page layout -- separate from the generic layout
 * in page.tsx because the photo gallery / description / features for
 * whichever car is selected belongs in the main column under the
 * title, not stacked inside the (already busy) booking card. Both
 * columns need to share which car is selected, so this one client
 * component owns that state and renders both sides of the page.
 */
export function CarHireProductSection({
  title,
  location,
  durationLabel,
  description,
  action,
  carTypes,
  packages,
  prices,
  meetingPoints,
  defaultDiscountCode,
  error,
}: CarHireProductSectionProps) {
  const [selectedCarType, setSelectedCarType] = useState<CarType | undefined>(carTypes[0]);

  return (
    <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          {location} {durationLabel ? `· ${durationLabel}` : ""}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{title}</h1>
        {description && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        )}

        {selectedCarType && (
          <div className="mt-6">
            <VehicleDetailPanel
              key={selectedCarType.id}
              name={selectedCarType.name}
              galleryUrls={
                selectedCarType.gallery_urls?.length
                  ? selectedCarType.gallery_urls
                  : selectedCarType.image_url
                    ? [selectedCarType.image_url]
                    : []
              }
              capacityLabel={`${selectedCarType.capacity_tier} seats`}
              recommendedFor={selectedCarType.recommended_for}
              description={selectedCarType.description}
              features={selectedCarType.features}
              placeholderEmoji="🚗"
            />
          </div>
        )}
      </div>

      <div className="h-fit rounded-2xl border border-sand-deep bg-white p-6">
        <p className="font-serif text-lg font-semibold text-ocean">
          Price by car, duration &amp; pickup area — pick your options below
        </p>
        <div className="my-4 h-px bg-sand-deep" />

        {error && (
          <p className="mb-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
            {error}
          </p>
        )}

        <CarHireBookingForm
          action={action}
          productTitle={title}
          carTypes={carTypes}
          packages={packages}
          prices={prices}
          meetingPoints={meetingPoints}
          defaultDiscountCode={defaultDiscountCode}
          onCarTypeChange={setSelectedCarType}
        />
      </div>
    </div>
  );
}
