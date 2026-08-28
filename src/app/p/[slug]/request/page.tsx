import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import { PARK_INSURANCE_FEE_IDR } from "@/lib/bookings/types";
import type { Product } from "@/lib/products/types";
import { SiteHeader } from "@/components/SiteHeader";
import { submitBookingRequestAction } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";

/**
 * Spec §6b / IA §4 (/request/[bookingId], adapted -- there's no booking
 * id yet at this point, so this is keyed by product + the date/pax the
 * product page already collected). One fieldset per traveler, index-
 * named (traveler_name_0, passport_0, ...) rather than repeated shared
 * names -- the insurance choice is a radio group, and radios sharing
 * one `name` across travelers would all belong to the same group.
 * pax is already known from the query string, so every fieldset
 * renders server-side with no client JS needed.
 */
export default async function BookingRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; pax?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { date, pax: paxRaw, error } = await searchParams;
  const pax = Math.min(20, Math.max(1, Number(paxRaw) || 1));

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!product) {
    notFound();
  }
  const p = product as Product;
  if (p.is_bookable) {
    notFound(); // this form only applies to manual-confirmation products
  }

  const adultPriceUsd = p.adult_price_usd ?? 0;
  const subtotalUsd = adultPriceUsd * pax;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{p.title}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">Request to book</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {date} · {pax} traveler{pax === 1 ? "" : "s"} · Est.{" "}
          {formatUsd(subtotalUsd)} ({formatIdr(usdToIdr(subtotalUsd))}) before any park insurance
          you add below
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
            {error}
          </p>
        )}

        <form
          action={submitBookingRequestAction.bind(null, p.id, p.slug, date ?? "", pax)}
          encType="multipart/form-data"
          className="mt-6 flex flex-col gap-8"
        >
          {Array.from({ length: pax }).map((_, i) => (
            <fieldset key={i} className="rounded-2xl border border-sand-deep bg-white p-5">
              <legend className="px-1 font-serif text-lg font-semibold text-ink">
                Traveler {i + 1}
              </legend>

              <div className="mt-2">
                <label className={labelClass} htmlFor={`traveler_name_${i}`}>
                  Full name (as on passport)
                </label>
                <input
                  id={`traveler_name_${i}`}
                  name={`traveler_name_${i}`}
                  required
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label className={labelClass} htmlFor={`passport_${i}`}>
                  Passport photo/scan
                </label>
                <input
                  id={`passport_${i}`}
                  name={`passport_${i}`}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  required
                  className="mt-1 block w-full text-sm text-ink-soft"
                />
                <p className="mt-1 text-xs text-ink-soft">JPG, PNG, or PDF, up to 5MB.</p>
              </div>

              <div className="mt-4">
                <p className={labelClass}>Insurance</p>
                <label className="mt-2 flex items-start gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={`insurance_type_${i}`}
                    value="self_provided"
                    defaultChecked
                    required
                    className="mt-1"
                  />
                  I have my own travel insurance
                </label>
                <div className="ml-6 mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name={`insurance_number_${i}`}
                    placeholder="Policy number"
                    className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    name={`insurance_company_${i}`}
                    placeholder="Insurance company"
                    className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
                  />
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={`insurance_type_${i}`}
                    value="park_provided"
                    className="mt-1"
                  />
                  Use park insurance ({formatIdr(PARK_INSURANCE_FEE_IDR)}/person, added to your
                  total)
                </label>
              </div>
            </fieldset>
          ))}

          <div className="rounded-2xl border border-sand-deep bg-white p-5">
            <label className={labelClass} htmlFor="hotel_name">
              Hotel name (optional)
            </label>
            <input id="hotel_name" name="hotel_name" className={inputClass} />
            <label className={`${labelClass} mt-4 block`} htmlFor="room_number">
              Room number (optional)
            </label>
            <input id="room_number" name="room_number" className={inputClass} />
          </div>

          <button
            type="submit"
            className="self-start rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-white"
          >
            Submit request
          </button>
          <p className="text-xs text-ink-soft">
            This is a request, not a payment -- we&apos;ll email you a payment link only once
            we&apos;ve confirmed park permit availability.
          </p>
        </form>
      </main>
    </>
  );
}
