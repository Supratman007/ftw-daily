"use client";

import { useState } from "react";
import { formatIdr } from "@/lib/currency";
import { whatsappLink } from "@/lib/contact";
import { OTHER_MEETING_POINT_VALUE, type MeetingPoint, type TransportPrice } from "@/lib/cars/types";

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
  prices: TransportPrice[];
  meetingPoints: MeetingPoint[];
  defaultDiscountCode?: string;
}

export function TransportBookingForm({
  action,
  productTitle,
  prices,
  meetingPoints,
  defaultDiscountCode,
}: TransportBookingFormProps) {
  const pricedMeetingPointIds = new Set(prices.map((p) => p.meeting_point_id));

  // Same reasoning as CarHireBookingForm: every active meeting point
  // is selectable, priced or not, so an area never just disappears
  // from the list because no one's priced it yet.
  const [meetingPointId, setMeetingPointId] = useState(
    meetingPoints.find((mp) => pricedMeetingPointIds.has(mp.id))?.id ??
      meetingPoints[0]?.id ??
      OTHER_MEETING_POINT_VALUE
  );
  const isOther = meetingPointId === OTHER_MEETING_POINT_VALUE;
  const price = prices.find((p) => p.meeting_point_id === meetingPointId);

  return (
    <form action={action} className="flex flex-col gap-3">
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
          <div className="font-serif text-xl font-bold text-ocean">{formatIdr(price.price_idr)}</div>
        ) : (
          <p className="text-ink-soft">
            We don&apos;t have a set price for that pickup area yet.{" "}
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
        disabled={!price}
        className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        Continue to checkout
      </button>
    </form>
  );
}
