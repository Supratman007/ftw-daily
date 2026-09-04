"use client";

import { useState } from "react";
import { formatIdr } from "@/lib/currency";
import { whatsappLink } from "@/lib/contact";
import {
  OTHER_MEETING_POINT_VALUE,
  type MeetingPoint,
  type TransportPrice,
  type TransportVehicleType,
} from "@/lib/cars/types";

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass = "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm";

interface TransportBookingFormProps {
  action: (formData: FormData) => void | Promise<void>;
  productTitle: string;
  vehicleTypes: TransportVehicleType[];
  prices: TransportPrice[];
  meetingPoints: MeetingPoint[];
  defaultDiscountCode?: string;
  /** Lets the page's main-column detail panel (photos, description,
   * features) stay in sync with the picker here, without duplicating
   * this form's own selection state. */
  onVehicleTypeChange?: (vehicleType: TransportVehicleType | undefined) => void;
}

export function TransportBookingForm({
  action,
  productTitle,
  vehicleTypes,
  prices,
  meetingPoints,
  defaultDiscountCode,
  onVehicleTypeChange,
}: TransportBookingFormProps) {
  const [vehicleTypeId, setVehicleTypeId] = useState(vehicleTypes[0]?.id ?? "");
  const [pickupId, setPickupId] = useState(meetingPoints[0]?.id ?? OTHER_MEETING_POINT_VALUE);
  const [dropoffId, setDropoffId] = useState(meetingPoints[1]?.id ?? OTHER_MEETING_POINT_VALUE);

  const isPickupOther = pickupId === OTHER_MEETING_POINT_VALUE;
  const isDropoffOther = dropoffId === OTHER_MEETING_POINT_VALUE;
  const sameArea = !isPickupOther && !isDropoffOther && pickupId === dropoffId;

  // A route is priced in whichever direction the admin entered it --
  // most operators charge the same either way, so a route entered only
  // as (A -> B) still quotes correctly for a customer going B -> A,
  // but an explicit (B -> A) row (if the admin set a different price
  // for that direction) always wins.
  const price =
    !sameArea && !isPickupOther && !isDropoffOther
      ? prices.find(
          (p) => p.vehicle_type_id === vehicleTypeId && p.from_meeting_point_id === pickupId && p.to_meeting_point_id === dropoffId
        ) ??
        prices.find(
          (p) => p.vehicle_type_id === vehicleTypeId && p.from_meeting_point_id === dropoffId && p.to_meeting_point_id === pickupId
        )
      : undefined;
  const selectedVehicleType = vehicleTypes.find((v) => v.id === vehicleTypeId);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <p className={labelClass}>Vehicle / service</p>
        {vehicleTypes.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">No options set up yet</p>
        ) : (
          <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {vehicleTypes.map((v) => (
              <label
                key={v.id}
                className={`cursor-pointer overflow-hidden rounded-lg border-2 text-left transition ${
                  vehicleTypeId === v.id ? "border-coral" : "border-sand-deep hover:border-teal"
                }`}
              >
                <input
                  type="radio"
                  name="vehicle_type_id"
                  value={v.id}
                  checked={vehicleTypeId === v.id}
                  onChange={() => {
                    setVehicleTypeId(v.id);
                    onVehicleTypeChange?.(v);
                  }}
                  className="sr-only"
                />
                {v.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- prototype-stage booking flow; Next/Image optimization is a later polish pass
                  <img src={v.image_url} alt={v.name} className="h-20 w-full object-cover" />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center bg-sand text-2xl">🚐</div>
                )}
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-ink">{v.name}</p>
                  {v.capacity_note && <p className="text-[11px] text-ink-soft">{v.capacity_note}</p>}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <label className={labelClass}>
        Number of passengers
        <input
          type="number"
          name="pax_count"
          min={1}
          max={20}
          required
          defaultValue={1}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Pick up from
          <select
            name="meeting_point_id"
            value={pickupId}
            onChange={(e) => setPickupId(e.target.value)}
            className={inputClass}
          >
            {meetingPoints.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name}
              </option>
            ))}
            <option value={OTHER_MEETING_POINT_VALUE}>Other — not on the list</option>
          </select>
        </label>
        <label className={labelClass}>
          Drop off at
          <select
            name="dropoff_meeting_point_id"
            value={dropoffId}
            onChange={(e) => setDropoffId(e.target.value)}
            className={inputClass}
          >
            {meetingPoints.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name}
              </option>
            ))}
            <option value={OTHER_MEETING_POINT_VALUE}>Other — not on the list</option>
          </select>
        </label>
      </div>
      {sameArea && (
        <p className="text-xs text-coral-dark">Pickup and drop-off can&apos;t be the same area.</p>
      )}

      {isPickupOther && (
        <label className={labelClass}>
          Tell us your pickup location
          <input
            type="text"
            name="meeting_point_custom"
            required
            placeholder="e.g. name of hotel/area"
            className={inputClass}
          />
        </label>
      )}
      {!isPickupOther && (
        <label className={labelClass}>
          Exact pickup spot (optional)
          <input
            type="text"
            name="meeting_point_custom"
            placeholder="e.g. Sunset Hotel, lobby -- or Lombok Airport, domestic arrivals"
            className={inputClass}
          />
        </label>
      )}

      {isDropoffOther && (
        <label className={labelClass}>
          Tell us your drop-off location
          <input
            type="text"
            name="dropoff_location_custom"
            required
            placeholder="e.g. name of hotel/area"
            className={inputClass}
          />
        </label>
      )}
      {!isDropoffOther && (
        <label className={labelClass}>
          Exact drop-off spot (optional)
          <input
            type="text"
            name="dropoff_location_custom"
            placeholder="e.g. The Oberoi, Gili Trawangan -- or Tete Batu, The Sira Resort"
            className={inputClass}
          />
        </label>
      )}

      <label className={labelClass}>
        Passenger name
        <input
          type="text"
          name="passenger_name"
          required
          placeholder="Who's traveling? (if not you, their full name)"
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        WhatsApp number for pickup
        <input
          type="tel"
          name="pickup_whatsapp_number"
          required
          placeholder="e.g. +62 812 3456 7890"
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case text-ink-soft">
          Your driver will message you here when they arrive.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Pickup date
          <input type="date" name="pickup_date" required min={tomorrow()} defaultValue={tomorrow()} className={inputClass} />
        </label>
        <label className={labelClass}>
          Pickup time
          <input type="time" name="pickup_time" required defaultValue="08:00" className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        Flight number / arrival details (optional)
        <input
          type="text"
          name="flight_details"
          placeholder="e.g. Garuda GA402, arriving 14:30"
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case text-ink-soft">
          Picking up from the airport? This helps your driver track your flight and be there when
          you land.
        </span>
      </label>

      <label className={labelClass}>
        Discount code (optional)
        <input
          type="text"
          name="discount_code"
          defaultValue={defaultDiscountCode ?? ""}
          placeholder="e.g. WELCOME10"
          className={`${inputClass} uppercase`}
        />
      </label>

      <div className="rounded-lg border border-sand-deep bg-sand p-3 text-sm">
        {price ? (
          <>
            {selectedVehicleType && (
              <span className="text-ink-soft">
                {selectedVehicleType.name}
                {selectedVehicleType.capacity_note ? ` · ${selectedVehicleType.capacity_note}` : ""}
              </span>
            )}
            <div className="mt-1 font-serif text-xl font-bold text-ocean">{formatIdr(price.price_idr)}</div>
          </>
        ) : (
          <p className="text-ink-soft">
            We don&apos;t have a set price for that route yet.{" "}
            <a
              href={whatsappLink(`Hi, I'd like a quote for ${productTitle}.`) ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-teal underline"
            >
              Message us on WhatsApp
            </a>{" "}
            for a quote.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!price || vehicleTypes.length === 0 || sameArea}
        className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        Continue to checkout
      </button>
    </form>
  );
}
