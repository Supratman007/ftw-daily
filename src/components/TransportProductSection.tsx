"use client";

import { useState } from "react";
import { TransportBookingForm } from "@/components/TransportBookingForm";
import { VehicleDetailPanel } from "@/components/VehicleDetailPanel";
import type { MeetingPoint, TransportPrice, TransportVehicleType } from "@/lib/cars/types";

interface TransportProductSectionProps {
  title: string;
  location: string | null;
  durationLabel: string | null;
  description: string | null;
  action: (formData: FormData) => void | Promise<void>;
  vehicleTypes: TransportVehicleType[];
  prices: TransportPrice[];
  meetingPoints: MeetingPoint[];
  defaultDiscountCode?: string;
  error?: string;
}

/** Transport's product-page layout -- same reasoning as
 * CarHireProductSection: the photo gallery / description / features
 * for whichever vehicle is selected belongs in the main column under
 * the title, not stacked inside the booking card. */
export function TransportProductSection({
  title,
  location,
  durationLabel,
  description,
  action,
  vehicleTypes,
  prices,
  meetingPoints,
  defaultDiscountCode,
  error,
}: TransportProductSectionProps) {
  const [selectedVehicleType, setSelectedVehicleType] = useState<TransportVehicleType | undefined>(
    vehicleTypes[0]
  );

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

        {selectedVehicleType && (
          <div className="mt-6">
            <VehicleDetailPanel
              key={selectedVehicleType.id}
              name={selectedVehicleType.name}
              galleryUrls={
                selectedVehicleType.gallery_urls?.length
                  ? selectedVehicleType.gallery_urls
                  : selectedVehicleType.image_url
                    ? [selectedVehicleType.image_url]
                    : []
              }
              capacityLabel={selectedVehicleType.capacity_note}
              recommendedFor={selectedVehicleType.recommended_for}
              description={selectedVehicleType.description}
              features={selectedVehicleType.features}
              placeholderEmoji="🚐"
            />
          </div>
        )}
      </div>

      <div className="h-fit rounded-2xl border border-sand-deep bg-white p-6">
        <p className="font-serif text-lg font-semibold text-ocean">
          Price by pickup area — pick your options below
        </p>
        <div className="my-4 h-px bg-sand-deep" />

        {error && (
          <p className="mb-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
            {error}
          </p>
        )}

        <TransportBookingForm
          action={action}
          productTitle={title}
          vehicleTypes={vehicleTypes}
          prices={prices}
          meetingPoints={meetingPoints}
          defaultDiscountCode={defaultDiscountCode}
          onVehicleTypeChange={setSelectedVehicleType}
        />
      </div>
    </div>
  );
}
