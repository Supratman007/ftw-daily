"use client";

import { useState } from "react";
import { TransportBookingForm, type TransportFormDict } from "@/components/TransportBookingForm";
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
  /** Earliest pickup date the product's minimum booking notice still
   * allows -- computed server-side (src/lib/products/leadTime.ts) so
   * the calendar never offers a date the server would reject. */
  minPickupDate: string;
  error?: string;
  /** Defaults to the English copy -- see CarHireProductSection's
   * identical priceLabel prop for why this stays a plain string prop
   * rather than locale/getDictionary plumbing. */
  priceLabel?: string;
  /** Same "optional, defaults to English inside the form itself" story
   * as priceLabel -- passed straight through to TransportBookingForm. */
  formDict?: TransportFormDict;
  /** Passed straight through to TransportBookingForm's hidden locale
   * field. */
  locale?: "en" | "id";
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
  minPickupDate,
  error,
  priceLabel = "Price by pickup area — pick your options below",
  formDict,
  locale,
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
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
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
        <p className="font-serif text-lg font-semibold text-ocean">{priceLabel}</p>
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
          minPickupDate={minPickupDate}
          onVehicleTypeChange={setSelectedVehicleType}
          dict={formDict}
          locale={locale}
        />
      </div>
    </div>
  );
}
