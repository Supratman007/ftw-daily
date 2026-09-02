import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { formatIdr, formatUsd } from "@/lib/currency";
import { customerLogoutAction } from "@/app/actions";

interface BookingRow {
  id: string;
  booking_code: string;
  slot_date: string;
  pax_count: number;
  total_idr: number;
  status: "pending_payment" | "paid_confirmed" | "expired" | "cancelled";
  product_id: string;
  discount_code: string | null;
  discount_amount_usd: number;
  pickup_datetime: string | null;
  meeting_point_id: string | null;
  meeting_point_custom: string | null;
  pickup_whatsapp_number: string | null;
  car_type_id: string | null;
  car_package_id: string | null;
  transport_vehicle_type_id: string | null;
  passenger_name: string | null;
  flight_details: string | null;
}

/**
 * Where Xendit's success_redirect_url sends a customer right after they
 * pay. The webhook (src/app/api/webhooks/xendit/route.ts) is what
 * actually marks the booking paid, and it can arrive a few seconds
 * after this redirect does -- so "pending_payment" here doesn't mean
 * something went wrong, just that the confirmation hasn't landed yet.
 * A short meta-refresh re-checks without the customer having to do
 * anything.
 */
export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const customer = await requireCustomer(`/confirmation/${bookingId}`);

  const supabase = await createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, booking_code, slot_date, pax_count, total_idr, status, product_id, discount_code, discount_amount_usd, pickup_datetime, meeting_point_id, meeting_point_custom, pickup_whatsapp_number, car_type_id, car_package_id, transport_vehicle_type_id, passenger_name, flight_details"
    )
    .eq("id", bookingId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!booking) {
    // RLS hides "doesn't exist" and "exists but belongs to a
    // different account" identically from the customer's own session
    // client -- a real gap this page hit in testing: a confirmation
    // link opened on a device/browser still signed into an older test
    // account (not the one that made this booking) landed on a bare,
    // unexplained 404. Service-role client here only to tell the two
    // cases apart for which message to show -- never to expose the
    // other booking's actual details.
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: anyBooking } = await serviceClient
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .maybeSingle();

    if (anyBooking) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Wrong account
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-coral-dark">
            This booking isn&apos;t linked to {customer.email}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            You&apos;re currently signed in as {customer.email}, but this booking was made under a
            different account. Log out and sign back in with the email you used when booking.
          </p>
          <form action={customerLogoutAction} className="mt-6">
            <button
              type="submit"
              className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
            >
              Log out
            </button>
          </form>
        </main>
      );
    }

    notFound();
  }
  const b = booking as BookingRow;

  const { data: product } = await supabase
    .from("products")
    .select("title, slug")
    .eq("id", b.product_id)
    .maybeSingle();

  let meetingPointName: string | null = null;
  if (b.meeting_point_id) {
    const { data: meetingPoint } = await supabase
      .from("meeting_points")
      .select("name")
      .eq("id", b.meeting_point_id)
      .maybeSingle();
    meetingPointName = meetingPoint?.name ?? null;
  }

  let carLabel: string | null = null;
  if (b.car_type_id && b.car_package_id) {
    const [{ data: carType }, { data: carPackage }] = await Promise.all([
      supabase.from("car_types").select("name").eq("id", b.car_type_id).maybeSingle(),
      supabase.from("car_packages").select("duration_hours").eq("id", b.car_package_id).maybeSingle(),
    ]);
    carLabel = carType ? `${carType.name}${carPackage ? `, ${carPackage.duration_hours}h` : ""}` : null;
  }
  if (b.transport_vehicle_type_id) {
    const { data: vehicleType } = await supabase
      .from("transport_vehicle_types")
      .select("name, capacity_note")
      .eq("id", b.transport_vehicle_type_id)
      .maybeSingle();
    carLabel = vehicleType
      ? `${vehicleType.name}${vehicleType.capacity_note ? `, ${vehicleType.capacity_note}` : ""}`
      : null;
  }

  if (b.status === "pending_payment") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <meta httpEquiv="refresh" content="4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          Booking {b.booking_code}
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-ocean">
          Confirming your payment&hellip;
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          This usually takes just a few seconds. This page will update on its own -- no need to
          refresh.
        </p>
      </main>
    );
  }

  if (b.status === "expired" || b.status === "cancelled") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          Booking {b.booking_code}
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-coral-dark">
          Payment didn&apos;t go through
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          This booking wasn&apos;t completed, so nothing was charged. You can try again from the
          trip page.
        </p>
        {product?.slug && (
          <a
            href={`/p/${product.slug}`}
            className="mt-6 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
          >
            Back to trip
          </a>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-teal">Booking confirmed</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ocean">
        {product?.title ?? "Your trip"}
      </h1>

      <div className="mt-6 w-full rounded-2xl border border-sand-deep bg-white p-6 text-left text-sm">
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Booking code</span>
          <span className="font-semibold text-ink">{b.booking_code}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Date</span>
          <span className="text-ink">{b.slot_date}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Travelers</span>
          <span className="text-ink">{b.pax_count}</span>
        </div>
        {b.pickup_datetime && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Pickup</span>
            <span className="text-ink">
              {new Date(b.pickup_datetime).toLocaleString()}
              {(meetingPointName || b.meeting_point_custom) &&
                ` — ${[meetingPointName, b.meeting_point_custom].filter(Boolean).join(", ")}`}
              {carLabel && ` (${carLabel})`}
            </span>
          </div>
        )}
        {b.passenger_name && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Passenger</span>
            <span className="text-ink">{b.passenger_name}</span>
          </div>
        )}
        {b.flight_details && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Flight</span>
            <span className="text-ink">{b.flight_details}</span>
          </div>
        )}
        {b.pickup_whatsapp_number && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Driver will WhatsApp</span>
            <span className="text-ink">{b.pickup_whatsapp_number}</span>
          </div>
        )}
        {b.discount_code && b.discount_amount_usd > 0 && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Discount ({b.discount_code})</span>
            <span className="text-teal">-{formatUsd(b.discount_amount_usd)}</span>
          </div>
        )}
        <div className="flex justify-between py-2">
          <span className="text-ink-soft">Total paid</span>
          <span className="font-semibold text-ink">{formatIdr(b.total_idr)}</span>
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        A confirmation email is on its way to you. See you on the trip!
      </p>

      <Link
        href="/"
        className="mt-6 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        Browse more trips
      </Link>
    </main>
  );
}
