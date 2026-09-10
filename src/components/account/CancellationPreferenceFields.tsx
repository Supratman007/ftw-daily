"use client";

import { useState } from "react";

/** This field's own fixed text -- same "plain object, not
 * getDictionary, since this is a client component" reasoning as
 * CarHireBookingForm's CarHireFormDict. */
export interface CancellationPreferenceDict {
  whatWouldYouLike: string;
  optional: string;
  justAPreference: string;
  refund: string;
  reschedule: string;
  giveAsGift: string;
  whatDateLabel: string;
  confirmOrClosest: string;
  recipientName: string;
  recipientNamePlaceholder: string;
  recipientEmail: string;
  recipientEmailPlaceholder: string;
  weWillSendDetails: string;
}

const DEFAULT_DICT: CancellationPreferenceDict = {
  whatWouldYouLike: "What would you like?",
  optional: "(optional)",
  justAPreference:
    "Just a preference, if you already know -- our team will confirm what's possible for your booking. (Force majeure requests get a reschedule or gift voucher, not a refund.)",
  refund: "A refund",
  reschedule: "Reschedule to a new date",
  giveAsGift: "Give it as a gift to someone else instead",
  whatDateLabel: "What date would you like instead?",
  confirmOrClosest: "We'll confirm this date if it's available, or offer you the closest open date if not.",
  recipientName: "Recipient's name",
  recipientNamePlaceholder: "Who's this trip going to?",
  recipientEmail: "Recipient's email",
  recipientEmailPlaceholder: "their@email.com",
  weWillSendDetails: "We'll send the voucher details to you -- this just tells our team who to address it to.",
};

interface CancellationPreferenceFieldsProps {
  /** Earliest date the customer can propose, as YYYY-MM-DD -- computed
   * server-side (tomorrow) since Date.now() would differ between server
   * render and client hydration. */
  minDate: string;
  dict?: CancellationPreferenceDict;
}

type Preference = "refund" | "reschedule" | "gift_voucher";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";
const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

/** The "what would you like?" preference picker, pulled into its own
 * client island so selecting "reschedule" or "gift voucher" can reveal
 * the follow-up fields each needs (a date; a recipient) right there.
 * Deliberately optional with nothing pre-selected -- an earlier version
 * defaulted to "refund" and required a choice, which read as every
 * customer demanding a refund before they'd even read the cancellation
 * terms. Force majeure vs. standard (a separate fieldset above this
 * one) isn't reflected here -- a force-majeure customer who picks
 * "refund" still gets a clear server-side message steering them to
 * reschedule or a voucher instead, same as before this field existed. */
export function CancellationPreferenceFields({ minDate, dict = DEFAULT_DICT }: CancellationPreferenceFieldsProps) {
  const [preference, setPreference] = useState<Preference | null>(null);

  return (
    <fieldset className="rounded-2xl border border-sand-deep bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-ink">
        {dict.whatWouldYouLike} <span className="font-normal normal-case text-ink-soft">{dict.optional}</span>
      </legend>
      <p className="mt-1 text-xs text-ink-soft">{dict.justAPreference}</p>
      <div className="mt-3 flex flex-col gap-2">
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="radio"
            name="preferred_resolution"
            value="refund"
            checked={preference === "refund"}
            onChange={() => setPreference("refund")}
            className="mt-1"
          />
          <span>{dict.refund}</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="radio"
            name="preferred_resolution"
            value="reschedule"
            checked={preference === "reschedule"}
            onChange={() => setPreference("reschedule")}
            className="mt-1"
          />
          <span>{dict.reschedule}</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="radio"
            name="preferred_resolution"
            value="gift_voucher"
            checked={preference === "gift_voucher"}
            onChange={() => setPreference("gift_voucher")}
            className="mt-1"
          />
          <span>{dict.giveAsGift}</span>
        </label>
      </div>

      {preference === "reschedule" && (
        <div className="mt-3 border-t border-sand-deep pt-3">
          <label className={labelClass} htmlFor="preferred_new_date">
            {dict.whatDateLabel}
          </label>
          <input
            id="preferred_new_date"
            name="preferred_new_date"
            type="date"
            min={minDate}
            required
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-soft">{dict.confirmOrClosest}</p>
        </div>
      )}

      {preference === "gift_voucher" && (
        <div className="mt-3 flex flex-col gap-3 border-t border-sand-deep pt-3">
          <div>
            <label className={labelClass} htmlFor="preferred_gift_recipient_name">
              {dict.recipientName}
            </label>
            <input
              id="preferred_gift_recipient_name"
              name="preferred_gift_recipient_name"
              type="text"
              required
              placeholder={dict.recipientNamePlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="preferred_gift_recipient_email">
              {dict.recipientEmail}
            </label>
            <input
              id="preferred_gift_recipient_email"
              name="preferred_gift_recipient_email"
              type="email"
              required
              placeholder={dict.recipientEmailPlaceholder}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink-soft">{dict.weWillSendDetails}</p>
          </div>
        </div>
      )}
    </fieldset>
  );
}
