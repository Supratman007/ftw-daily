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

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass = "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm";

/** This form's own fixed text -- same "plain object, not getDictionary,
 * since this is a client component" reasoning as CarHireBookingForm's
 * identical CarHireFormDict. */
export interface TransportFormDict {
  vehicleLabel: string;
  noOptionsOption: string;
  passengersLabel: string;
  pickupFromLabel: string;
  dropoffAtLabel: string;
  otherOption: string;
  sameAreaError: string;
  tellUsPickupLabel: string;
  exactPickupLabel: string;
  otherPickupPlaceholder: string;
  normalPickupPlaceholder: string;
  tellUsDropoffLabel: string;
  exactDropoffLabel: string;
  normalDropoffPlaceholder: string;
  passengerNameLabel: string;
  passengerNamePlaceholder: string;
  whatsappLabel: string;
  whatsappPlaceholder: string;
  whatsappHint: string;
  pickupDateLabel: string;
  pickupTimeLabel: string;
  flightLabel: string;
  flightPlaceholder: string;
  flightHint: string;
  discountCodeLabel: string;
  discountCodePlaceholder: string;
  noPriceNotice: string;
  messageUsOnWhatsapp: string;
  forAQuote: string;
  continueToCheckout: string;
}

const DEFAULT_DICT: TransportFormDict = {
  vehicleLabel: "Vehicle / service",
  noOptionsOption: "No options set up yet",
  passengersLabel: "Number of passengers",
  pickupFromLabel: "Pick up from",
  dropoffAtLabel: "Drop off at",
  otherOption: "Other — not on the list",
  sameAreaError: "Pickup and drop-off can't be the same area.",
  tellUsPickupLabel: "Tell us your pickup location",
  exactPickupLabel: "Exact pickup spot (optional)",
  otherPickupPlaceholder: "e.g. name of hotel/area",
  normalPickupPlaceholder: "e.g. Sunset Hotel, lobby -- or Lombok Airport, domestic arrivals",
  tellUsDropoffLabel: "Tell us your drop-off location",
  exactDropoffLabel: "Exact drop-off spot (optional)",
  normalDropoffPlaceholder: "e.g. The Oberoi, Gili Trawangan -- or Tete Batu, The Sira Resort",
  passengerNameLabel: "Passenger name",
  passengerNamePlaceholder: "Who's traveling? (if not you, their full name)",
  whatsappLabel: "WhatsApp number for pickup",
  whatsappPlaceholder: "e.g. +62 812 3456 7890",
  whatsappHint: "Your driver will message you here when they arrive.",
  pickupDateLabel: "Pickup date",
  pickupTimeLabel: "Pickup time",
  flightLabel: "Flight number / arrival details (optional)",
  flightPlaceholder: "e.g. Garuda GA402, arriving 14:30",
  flightHint: "Picking up from the airport? This helps your driver track your flight and be there when you land.",
  discountCodeLabel: "Discount code (optional)",
  discountCodePlaceholder: "e.g. WELCOME10",
  noPriceNotice: "We don't have a set price for that route yet.",
  messageUsOnWhatsapp: "Message us on WhatsApp",
  forAQuote: "for a quote.",
  continueToCheckout: "Continue to checkout",
};

interface TransportBookingFormProps {
  action: (formData: FormData) => void | Promise<void>;
  productTitle: string;
  vehicleTypes: TransportVehicleType[];
  prices: TransportPrice[];
  meetingPoints: MeetingPoint[];
  defaultDiscountCode?: string;
  /** Earliest pickup date the product's minimum booking notice still
   * allows -- computed server-side (src/lib/products/leadTime.ts). */
  minPickupDate: string;
  /** Lets the page's main-column detail panel (photos, description,
   * features) stay in sync with the picker here, without duplicating
   * this form's own selection state. */
  onVehicleTypeChange?: (vehicleType: TransportVehicleType | undefined) => void;
  dict?: TransportFormDict;
  /** Carried as a hidden field so startTransportCheckoutAction knows
   * which language to send the customer back to on error/login --
   * same "plain prop, not getDictionary" story as dict above. Defaults
   * to English so nothing breaks if a caller doesn't pass it yet. */
  locale?: "en" | "id";
}

export function TransportBookingForm({
  action,
  productTitle,
  vehicleTypes,
  prices,
  meetingPoints,
  defaultDiscountCode,
  minPickupDate,
  onVehicleTypeChange,
  dict = DEFAULT_DICT,
  locale = "en",
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
      <input type="hidden" name="locale" value={locale} />
      <label className={labelClass}>
        {dict.vehicleLabel}
        <select
          name="vehicle_type_id"
          value={vehicleTypeId}
          onChange={(e) => {
            const v = vehicleTypes.find((vt) => vt.id === e.target.value);
            setVehicleTypeId(e.target.value);
            onVehicleTypeChange?.(v);
          }}
          className={inputClass}
        >
          {vehicleTypes.length === 0 && <option value="">{dict.noOptionsOption}</option>}
          {vehicleTypes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.capacity_note ? ` — ${v.capacity_note}` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        {dict.passengersLabel}
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
          {dict.pickupFromLabel}
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
            <option value={OTHER_MEETING_POINT_VALUE}>{dict.otherOption}</option>
          </select>
        </label>
        <label className={labelClass}>
          {dict.dropoffAtLabel}
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
            <option value={OTHER_MEETING_POINT_VALUE}>{dict.otherOption}</option>
          </select>
        </label>
      </div>
      {sameArea && <p className="text-xs text-coral-dark">{dict.sameAreaError}</p>}

      {isPickupOther && (
        <label className={labelClass}>
          {dict.tellUsPickupLabel}
          <input
            type="text"
            name="meeting_point_custom"
            required
            placeholder={dict.otherPickupPlaceholder}
            className={inputClass}
          />
        </label>
      )}
      {!isPickupOther && (
        <label className={labelClass}>
          {dict.exactPickupLabel}
          <input
            type="text"
            name="meeting_point_custom"
            placeholder={dict.normalPickupPlaceholder}
            className={inputClass}
          />
        </label>
      )}

      {isDropoffOther && (
        <label className={labelClass}>
          {dict.tellUsDropoffLabel}
          <input
            type="text"
            name="dropoff_location_custom"
            required
            placeholder={dict.otherPickupPlaceholder}
            className={inputClass}
          />
        </label>
      )}
      {!isDropoffOther && (
        <label className={labelClass}>
          {dict.exactDropoffLabel}
          <input
            type="text"
            name="dropoff_location_custom"
            placeholder={dict.normalDropoffPlaceholder}
            className={inputClass}
          />
        </label>
      )}

      <label className={labelClass}>
        {dict.passengerNameLabel}
        <input
          type="text"
          name="passenger_name"
          required
          placeholder={dict.passengerNamePlaceholder}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        {dict.whatsappLabel}
        <input
          type="tel"
          name="pickup_whatsapp_number"
          required
          placeholder={dict.whatsappPlaceholder}
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case text-ink-soft">
          {dict.whatsappHint}
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          {dict.pickupDateLabel}
          <input type="date" name="pickup_date" required min={minPickupDate} defaultValue={minPickupDate} className={inputClass} />
        </label>
        <label className={labelClass}>
          {dict.pickupTimeLabel}
          <input type="time" name="pickup_time" required defaultValue="08:00" className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        {dict.flightLabel}
        <input
          type="text"
          name="flight_details"
          placeholder={dict.flightPlaceholder}
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case text-ink-soft">
          {dict.flightHint}
        </span>
      </label>

      <label className={labelClass}>
        {dict.discountCodeLabel}
        <input
          type="text"
          name="discount_code"
          defaultValue={defaultDiscountCode ?? ""}
          placeholder={dict.discountCodePlaceholder}
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
            {dict.noPriceNotice}{" "}
            <a
              href={whatsappLink(`Hi, I'd like a quote for ${productTitle}.`) ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-teal underline"
            >
              {dict.messageUsOnWhatsapp}
            </a>{" "}
            {dict.forAQuote}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!price || vehicleTypes.length === 0 || sameArea}
        className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {dict.continueToCheckout}
      </button>
    </form>
  );
}
