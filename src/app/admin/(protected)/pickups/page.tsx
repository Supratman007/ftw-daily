import Link from "next/link";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lombokDateString, lombokTodayAndTomorrow } from "@/lib/timezone";
import { tripStartFromDate } from "@/lib/products/leadTime";
import { buildDriverMessageLink } from "@/lib/bookings/driverMessage";

type PickupBookingRow = {
  id: string;
  booking_code: string;
  pickup_datetime: string;
  meeting_point_id: string | null;
  meeting_point_custom: string | null;
  dropoff_meeting_point_id: string | null;
  dropoff_location_custom: string | null;
  pickup_whatsapp_number: string | null;
  passenger_name: string | null;
  flight_details: string | null;
  car_type_id: string | null;
  car_package_id: string | null;
  transport_vehicle_type_id: string | null;
  products: { title: string } | null;
  customers: { name: string } | null;
};

/**
 * There's no driver login anywhere in this app (confirmed directly --
 * drivers get their pickup details from reservations staff over
 * WhatsApp, they never open the app themselves). What staff actually
 * needed was a single screen listing every confirmed pickup coming up,
 * instead of checking bookings one at a time -- this is that screen,
 * plus the same "Send to driver via WhatsApp" link the booking detail
 * page already has, so forwarding one takes one click from here too.
 */
export default async function AdminPickupsPage() {
  await requireAdminSection("pickups");

  const supabase = await createSupabaseServerClient();

  const { todayStr, tomorrowStr, dayAfterTomorrowStr } = lombokTodayAndTomorrow();
  const rangeStart = tripStartFromDate(todayStr);
  const rangeEnd = tripStartFromDate(dayAfterTomorrowStr);

  const { data } = await supabase
    .from("bookings")
    .select(
      "id, booking_code, pickup_datetime, meeting_point_id, meeting_point_custom, dropoff_meeting_point_id, dropoff_location_custom, pickup_whatsapp_number, passenger_name, flight_details, car_type_id, car_package_id, transport_vehicle_type_id, products(title), customers(name)"
    )
    .eq("status", "paid_confirmed")
    .not("pickup_datetime", "is", null)
    .gte("pickup_datetime", rangeStart.toISOString())
    .lt("pickup_datetime", rangeEnd.toISOString())
    .order("pickup_datetime", { ascending: true });

  const bookings = (data ?? []) as unknown as PickupBookingRow[];

  // Batch-fetch the names/labels every row might need, rather than one
  // query per row -- the pickup list can easily have a dozen+ rows on
  // a busy day.
  const meetingPointIds = Array.from(
    new Set(
      bookings
        .flatMap((b) => [b.meeting_point_id, b.dropoff_meeting_point_id])
        .filter((v): v is string => Boolean(v))
    )
  );
  const carTypeIds = Array.from(new Set(bookings.map((b) => b.car_type_id).filter((v): v is string => Boolean(v))));
  const carPackageIds = Array.from(
    new Set(bookings.map((b) => b.car_package_id).filter((v): v is string => Boolean(v)))
  );
  const vehicleTypeIds = Array.from(
    new Set(bookings.map((b) => b.transport_vehicle_type_id).filter((v): v is string => Boolean(v)))
  );

  const [{ data: meetingPoints }, { data: carTypes }, { data: carPackages }, { data: vehicleTypes }] =
    await Promise.all([
      meetingPointIds.length
        ? supabase.from("meeting_points").select("id, name").in("id", meetingPointIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      carTypeIds.length
        ? supabase.from("car_types").select("id, name").in("id", carTypeIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      carPackageIds.length
        ? supabase.from("car_packages").select("id, duration_hours").in("id", carPackageIds)
        : Promise.resolve({ data: [] as { id: string; duration_hours: number }[] }),
      vehicleTypeIds.length
        ? supabase.from("transport_vehicle_types").select("id, name, capacity_note").in("id", vehicleTypeIds)
        : Promise.resolve({ data: [] as { id: string; name: string; capacity_note: string | null }[] }),
    ]);

  const meetingPointNameById = new Map((meetingPoints ?? []).map((m) => [m.id, m.name]));
  const carTypeNameById = new Map((carTypes ?? []).map((c) => [c.id, c.name]));
  const carPackageHoursById = new Map((carPackages ?? []).map((p) => [p.id, p.duration_hours]));
  const vehicleTypeById = new Map((vehicleTypes ?? []).map((v) => [v.id, v]));

  function carLabelFor(b: PickupBookingRow): string | null {
    if (b.car_type_id) {
      const name = carTypeNameById.get(b.car_type_id);
      const hours = b.car_package_id ? carPackageHoursById.get(b.car_package_id) : null;
      return name ? `${name}${hours ? `, ${hours}h` : ""}` : null;
    }
    if (b.transport_vehicle_type_id) {
      const v = vehicleTypeById.get(b.transport_vehicle_type_id);
      return v ? `${v.name}${v.capacity_note ? `, ${v.capacity_note}` : ""}` : null;
    }
    return null;
  }

  // Bucket by Lombok calendar date rather than assuming query order
  // lines up with exactly two days -- a pickup right at a day boundary
  // is exactly why this reads the date back out per-row instead of
  // just splitting the list in half.
  const byDate = new Map<string, PickupBookingRow[]>();
  for (const b of bookings) {
    const dateKey = lombokDateString(new Date(b.pickup_datetime));
    const existing = byDate.get(dateKey);
    if (existing) existing.push(b);
    else byDate.set(dateKey, [b]);
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Pickups</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every confirmed pickup today and tomorrow, earliest first — forward each one to the driver on WhatsApp.
      </p>

      {bookings.length === 0 && (
        <p className="mt-6 text-sm text-ink-soft">No pickups scheduled for today or tomorrow.</p>
      )}

      {[todayStr, tomorrowStr].map((dateKey) => {
        const rows = byDate.get(dateKey) ?? [];
        if (rows.length === 0) return null;
        const label = dateKey === todayStr ? "Today" : "Tomorrow";
        return (
          <div key={dateKey} className="mt-8">
            <h2 className="font-serif text-lg font-semibold text-ink">
              {label} · {dateKey}
            </h2>
            <div className="mt-2 flex flex-col gap-3">
              {rows.map((b) => {
                const pickupArea =
                  [meetingPointNameById.get(b.meeting_point_id ?? ""), b.meeting_point_custom]
                    .filter(Boolean)
                    .join(", ") || "Not set";
                const dropoffArea =
                  [meetingPointNameById.get(b.dropoff_meeting_point_id ?? ""), b.dropoff_location_custom]
                    .filter(Boolean)
                    .join(", ") || null;
                const carLabel = carLabelFor(b);
                const driverLink = buildDriverMessageLink({
                  productTitle: b.products?.title,
                  bookingCode: b.booking_code,
                  pickupDatetime: b.pickup_datetime,
                  carLabel,
                  pickupArea,
                  dropoffArea,
                  passengerName: b.passenger_name,
                  customerName: b.customers?.name,
                  flightDetails: b.flight_details,
                  pickupWhatsappNumber: b.pickup_whatsapp_number,
                });

                return (
                  <div key={b.id} className="rounded-2xl border border-sand-deep bg-white p-5 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-serif text-lg font-semibold text-ocean">
                          {new Date(b.pickup_datetime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="mt-1 font-semibold text-ink">{b.products?.title ?? "Trip"}</p>
                        <p className="text-xs text-ink-soft">{b.booking_code}</p>
                      </div>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="text-xs font-semibold text-teal hover:underline"
                      >
                        View booking →
                      </Link>
                    </div>

                    <div className="mt-3 grid gap-1 text-ink-soft">
                      <p>
                        <span className="font-semibold text-ink">Passenger:</span>{" "}
                        {b.passenger_name ?? b.customers?.name ?? "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-ink">From:</span> {pickupArea}
                      </p>
                      {dropoffArea && (
                        <p>
                          <span className="font-semibold text-ink">To:</span> {dropoffArea}
                        </p>
                      )}
                      {carLabel && (
                        <p>
                          <span className="font-semibold text-ink">Car:</span> {carLabel}
                        </p>
                      )}
                      {b.flight_details && (
                        <p>
                          <span className="font-semibold text-ink">Flight:</span> {b.flight_details}
                        </p>
                      )}
                      {b.pickup_whatsapp_number && (
                        <p>
                          <span className="font-semibold text-ink">Customer WhatsApp:</span>{" "}
                          {b.pickup_whatsapp_number}
                        </p>
                      )}
                    </div>

                    <a
                      href={driverLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Send to driver via WhatsApp →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
