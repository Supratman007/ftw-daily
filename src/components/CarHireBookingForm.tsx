"use client";

import { useMemo, useState } from "react";
import { formatIdr } from "@/lib/currency";
import { whatsappLink } from "@/lib/contact";
import {
  OTHER_MEETING_POINT_VALUE,
  type CarType,
  type CarPackage,
  type CarPackagePrice,
  type MeetingPoint,
} from "@/lib/cars/types";

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass = "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm";

interface CarHireBookingFormProps {
  action: (formData: FormData) => void | Promise<void>;
  productTitle: string;
  carTypes: CarType[];
  packages: CarPackage[];
  prices: CarPackagePrice[];
  meetingPoints: MeetingPoint[];
  defaultDiscountCode?: string;
}

export function CarHireBookingForm({
  action,
  productTitle,
  carTypes,
  packages,
  prices,
  meetingPoints,
  defaultDiscountCode,
}: CarHireBookingFormProps) {
  const [carTypeId, setCarTypeId] = useState(carTypes[0]?.id ?? "");
  const packagesForCarType = useMemo(
    () => packages.filter((p) => p.car_type_id === carTypeId),
    [packages, carTypeId]
  );
  const [packageId, setPackageId] = useState(packagesForCarType[0]?.id ?? "");
  const effectivePackageId = packagesForCarType.some((p) => p.id === packageId)
    ? packageId
    : (packagesForCarType[0]?.id ?? "");

  const pricedMeetingPointIds = useMemo(
    () => new Set(prices.filter((p) => p.car_package_id === effectivePackageId).map((p) => p.meeting_point_id)),
    [prices, effectivePackageId]
  );

  // Every active meeting point is always selectable -- not just the
  // ones already priced for the current car/duration -- so a customer
  // can pick any real area and see either a price or a "we'll quote
  // you" message, rather than the area disappearing from the list
  // entirely just because this particular combination isn't priced
  // yet. Defaults to a priced one when one exists, purely so the form
  // opens showing a real price rather than a blank one.
  const [meetingPointId, setMeetingPointId] = useState(
    meetingPoints.find((mp) => pricedMeetingPointIds.has(mp.id))?.id ??
      meetingPoints[0]?.id ??
      OTHER_MEETING_POINT_VALUE
  );

  const price = prices.find(
    (p) => p.car_package_id === effectivePackageId && p.meeting_point_id === meetingPointId
  );

  const selectedCarType = carTypes.find((c) => c.id === carTypeId);
  const selectedPackage = packagesForCarType.find((p) => p.id === effectivePackageId);
  const isOther = meetingPointId === OTHER_MEETING_POINT_VALUE;

  const [paxCount, setPaxCount] = useState(1);
  const maxPax = selectedCarType?.capacity_tier ?? 6;
  const paxTooMany = paxCount > maxPax;

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <p className={labelClass}>Car</p>
        <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {carTypes.map((c) => (
            <label
              key={c.id}
              className={`cursor-pointer overflow-hidden rounded-lg border-2 text-left transition ${
                carTypeId === c.id ? "border-coral" : "border-sand-deep hover:border-teal"
              }`}
            >
              <input
                type="radio"
                name="car_type_id"
                value={c.id}
                checked={carTypeId === c.id}
                onChange={() => {
                  setCarTypeId(c.id);
                  setPackageId("");
                }}
                className="sr-only"
              />
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- prototype-stage booking flow; Next/Image optimization is a later polish pass
                <img src={c.image_url} alt={c.name} className="h-20 w-full object-cover" />
              ) : (
                <div className="flex h-20 w-full items-center justify-center bg-sand text-2xl">🚗</div>
              )}
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-ink">{c.name}</p>
                <p className="text-[11px] text-ink-soft">{c.capacity_tier} seats</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <label className={labelClass}>
        Number of passengers
        <input
          type="number"
          name="pax_count"
          min={1}
          max={maxPax}
          required
          value={paxCount}
          onChange={(e) => setPaxCount(Number(e.target.value) || 1)}
          className={inputClass}
        />
        {paxTooMany && (
          <span className="mt-1 block text-[11px] font-normal normal-case text-coral-dark">
            {selectedCarType?.name ?? "This car"} seats up to {maxPax} — please choose a bigger
            car or fewer passengers.
          </span>
        )}
      </label>

      <label className={labelClass}>
        Duration
        <select
          name="car_package_id"
          value={effectivePackageId}
          onChange={(e) => setPackageId(e.target.value)}
          className={inputClass}
        >
          {packagesForCarType.length === 0 && <option value="">No durations set up yet</option>}
          {packagesForCarType.map((p) => (
            <option key={p.id} value={p.id}>
              {p.duration_hours} hours
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Pickup area
        <select
          name="meeting_point_id"
          value={meetingPointId}
          onChange={(e) => setMeetingPointId(e.target.value)}
          className={inputClass}
        >
          {meetingPoints.map((mp) => (
            <option key={mp.id} value={mp.id}>
              {mp.name}
              {!pricedMeetingPointIds.has(mp.id) ? " (ask us for a price)" : ""}
            </option>
          ))}
          <option value={OTHER_MEETING_POINT_VALUE}>Other — not on the list</option>
        </select>
      </label>

      <label className={labelClass}>
        {isOther ? "Tell us your pickup location" : "Exact pickup spot (optional)"}
        <input
          type="text"
          name="meeting_point_custom"
          required={isOther}
          placeholder={
            isOther
              ? "e.g. name of hotel/area"
              : "e.g. Sunset Hotel, lobby -- or Lombok Airport, domestic arrivals"
          }
          className={inputClass}
        />
        {!isOther && (
          <span className="mt-1 block text-[11px] font-normal normal-case text-ink-soft">
            The area above sets the price -- this is just so the driver finds you: hotel name and
            where to wait, or the exact airport terminal/gate.
          </span>
        )}
      </label>

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
            <span className="text-ink-soft">
              {selectedCarType?.name} · {selectedPackage?.duration_hours}h
            </span>
            <div className="mt-1 font-serif text-xl font-bold text-ocean">{formatIdr(price.price_idr)}</div>
            {selectedPackage && selectedPackage.overtime_rate_per_hour_idr > 0 && (
              <p className="mt-1 text-xs text-ink-soft">
                Running over? Overtime is {formatIdr(selectedPackage.overtime_rate_per_hour_idr)}/hour, paid
                in cash to the driver.
              </p>
            )}
          </>
        ) : (
          <p className="text-ink-soft">
            We don&apos;t have a set price for that combination yet.{" "}
            <a
              href={whatsappLink(`Hi, I'd like a quote for hiring a car for ${productTitle}.`) ?? undefined}
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
        disabled={!price || packagesForCarType.length === 0 || paxTooMany}
        className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        Continue to checkout
      </button>
    </form>
  );
}
