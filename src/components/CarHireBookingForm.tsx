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

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass = "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm";

/** Fills in a "{token}" placeholder template with a real value. Kept as
 * a plain string-replace (not a template function) so these entries
 * can live in the Dictionary object that ProductPage.tsx (a Server
 * Component) passes down to this "use client" form as a prop --
 * React refuses to serialize a function across that boundary
 * ("Functions cannot be passed directly to Client Components..."),
 * which is exactly the crash this replaced. */
function fillTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [token, value]) => text.replaceAll(`{${token}}`, String(value)),
    template
  );
}

/** This form's own fixed text (labels, placeholders, hints) --
 * separate from the app-wide Dictionary type (src/lib/i18n/
 * dictionaries/en.ts) since getDictionary() is server-only and this is
 * a "use client" component (needs the useState pickers below); the
 * parent page resolves the real dictionary and passes the matching
 * `carHireForm` section down as a plain object instead. Defaults to
 * English so every other caller of this component keeps working
 * unchanged. */
export interface CarHireFormDict {
  carLabel: string;
  /** Template with a "{n}" token -- see fillTemplate. */
  seatsLabel: string;
  passengersLabel: string;
  /** Template with "{car}" and "{max}" tokens -- see fillTemplate. */
  capacityWarning: string;
  durationLabel: string;
  noDurationsOption: string;
  /** Template with a "{n}" token -- see fillTemplate. */
  hoursLabel: string;
  pickupAreaLabel: string;
  askForPriceSuffix: string;
  otherOption: string;
  tellUsPickupLabel: string;
  exactPickupLabel: string;
  otherPickupPlaceholder: string;
  normalPickupPlaceholder: string;
  pickupAreaHint: string;
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
  /** Template with a "{rate}" token -- see fillTemplate. */
  overtimeNotice: string;
  noPriceNotice: string;
  messageUsOnWhatsapp: string;
  forAQuote: string;
  continueToCheckout: string;
}

const DEFAULT_DICT: CarHireFormDict = {
  carLabel: "Car",
  seatsLabel: "{n} seats",
  passengersLabel: "Number of passengers",
  capacityWarning: "{car} seats up to {max} — please choose a bigger car or fewer passengers.",
  durationLabel: "Duration",
  noDurationsOption: "No durations set up yet",
  hoursLabel: "{n} hours",
  pickupAreaLabel: "Pickup area",
  askForPriceSuffix: " (ask us for a price)",
  otherOption: "Other — not on the list",
  tellUsPickupLabel: "Tell us your pickup location",
  exactPickupLabel: "Exact pickup spot (optional)",
  otherPickupPlaceholder: "e.g. name of hotel/area",
  normalPickupPlaceholder: "e.g. Sunset Hotel, lobby -- or Lombok Airport, domestic arrivals",
  pickupAreaHint:
    "The area above sets the price -- this is just so the driver finds you: hotel name and where to wait, or the exact airport terminal/gate.",
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
  overtimeNotice: "Running over? Overtime is {rate}/hour, paid in cash to the driver.",
  noPriceNotice: "We don't have a set price for that combination yet.",
  messageUsOnWhatsapp: "Message us on WhatsApp",
  forAQuote: "for a quote.",
  continueToCheckout: "Continue to checkout",
};

interface CarHireBookingFormProps {
  action: (formData: FormData) => void | Promise<void>;
  productTitle: string;
  carTypes: CarType[];
  packages: CarPackage[];
  prices: CarPackagePrice[];
  meetingPoints: MeetingPoint[];
  defaultDiscountCode?: string;
  /** Earliest pickup date the product's minimum booking notice still
   * allows -- computed server-side (src/lib/products/leadTime.ts). */
  minPickupDate: string;
  /** Lets the page's main-column detail panel (photos, description,
   * features) stay in sync with the picker here, without duplicating
   * this form's own selection state. */
  onCarTypeChange?: (carType: CarType | undefined) => void;
  dict?: CarHireFormDict;
  /** Carried as a hidden field so startCarHireCheckoutAction knows
   * which language to send the customer back to on error/login --
   * same "plain prop, not getDictionary" story as dict above. Defaults
   * to English so nothing breaks if a caller doesn't pass it yet. */
  locale?: "en" | "id";
}

export function CarHireBookingForm({
  action,
  productTitle,
  carTypes,
  packages,
  prices,
  meetingPoints,
  defaultDiscountCode,
  minPickupDate,
  onCarTypeChange,
  dict = DEFAULT_DICT,
  locale = "en",
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
      <input type="hidden" name="locale" value={locale} />
      <label className={labelClass}>
        {dict.carLabel}
        <select
          name="car_type_id"
          value={carTypeId}
          onChange={(e) => {
            const c = carTypes.find((ct) => ct.id === e.target.value);
            setCarTypeId(e.target.value);
            setPackageId("");
            onCarTypeChange?.(c);
          }}
          className={inputClass}
        >
          {carTypes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {fillTemplate(dict.seatsLabel, { n: c.capacity_tier })}
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
          max={maxPax}
          required
          value={paxCount}
          onChange={(e) => setPaxCount(Number(e.target.value) || 1)}
          className={inputClass}
        />
        {paxTooMany && (
          <span className="mt-1 block text-[11px] font-normal normal-case text-coral-dark">
            {fillTemplate(dict.capacityWarning, { car: selectedCarType?.name ?? "This car", max: maxPax })}
          </span>
        )}
      </label>

      <label className={labelClass}>
        {dict.durationLabel}
        <select
          name="car_package_id"
          value={effectivePackageId}
          onChange={(e) => setPackageId(e.target.value)}
          className={inputClass}
        >
          {packagesForCarType.length === 0 && <option value="">{dict.noDurationsOption}</option>}
          {packagesForCarType.map((p) => (
            <option key={p.id} value={p.id}>
              {fillTemplate(dict.hoursLabel, { n: p.duration_hours })}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        {dict.pickupAreaLabel}
        <select
          name="meeting_point_id"
          value={meetingPointId}
          onChange={(e) => setMeetingPointId(e.target.value)}
          className={inputClass}
        >
          {meetingPoints.map((mp) => (
            <option key={mp.id} value={mp.id}>
              {mp.name}
              {!pricedMeetingPointIds.has(mp.id) ? dict.askForPriceSuffix : ""}
            </option>
          ))}
          <option value={OTHER_MEETING_POINT_VALUE}>{dict.otherOption}</option>
        </select>
      </label>

      <label className={labelClass}>
        {isOther ? dict.tellUsPickupLabel : dict.exactPickupLabel}
        <input
          type="text"
          name="meeting_point_custom"
          required={isOther}
          placeholder={isOther ? dict.otherPickupPlaceholder : dict.normalPickupPlaceholder}
          className={inputClass}
        />
        {!isOther && (
          <span className="mt-1 block text-[11px] font-normal normal-case text-ink-soft">
            {dict.pickupAreaHint}
          </span>
        )}
      </label>

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
            <span className="text-ink-soft">
              {selectedCarType?.name} · {selectedPackage?.duration_hours}h
            </span>
            <div className="mt-1 font-serif text-xl font-bold text-ocean">{formatIdr(price.price_idr)}</div>
            {selectedPackage && selectedPackage.overtime_rate_per_hour_idr > 0 && (
              <p className="mt-1 text-xs text-ink-soft">
                {fillTemplate(dict.overtimeNotice, { rate: formatIdr(selectedPackage.overtime_rate_per_hour_idr) })}
              </p>
            )}
          </>
        ) : (
          <p className="text-ink-soft">
            {dict.noPriceNotice}{" "}
            <a
              href={whatsappLink(`Hi, I'd like a quote for hiring a car for ${productTitle}.`) ?? undefined}
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
        disabled={!price || packagesForCarType.length === 0 || paxTooMany}
        className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:bg-coral-dark disabled:hover:bg-coral"
      >
        {dict.continueToCheckout}
      </button>
    </form>
  );
}
