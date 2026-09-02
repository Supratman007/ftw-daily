import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd } from "@/lib/currency";
import { formatCommissionAmount } from "@/lib/agents/commission";
import { BOOKING_STATUS_LABELS, type Booking } from "@/lib/bookings/types";
import { startCustomerConversationAction } from "../../inbox/actions";

type BookingRow = Booking & {
  products: { title: string; slug: string } | null;
  customers: { name: string; email: string; phone: string | null } | null;
  sales_agents: { name: string; referral_code: string } | null;
};

/**
 * Admin's version of the booking detail page -- full picture in one
 * place, unlike the deliberately lean list row. Requires the admin read
 * policies from 0005_admin_bookings_access.sql.
 */
export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bookings")
    .select("*, products(title, slug), customers(name, email, phone), sales_agents(name, referral_code)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const b = data as BookingRow;

  // insurance_total_idr can be 0 even for a manual-confirmation
  // booking (every traveler could have their own insurance), so a
  // traveler row existing at all is the reliable signal that this
  // came through the request flow rather than instant checkout.
  const { count: travelerCount } = await supabase
    .from("travelers")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", b.id);

  let meetingPointName: string | null = null;
  let carLabel: string | null = null;
  if (b.pickup_datetime) {
    if (b.meeting_point_id) {
      const { data: meetingPoint } = await supabase
        .from("meeting_points")
        .select("name")
        .eq("id", b.meeting_point_id)
        .maybeSingle();
      meetingPointName = meetingPoint?.name ?? null;
    }
    if (b.car_type_id && b.car_package_id) {
      const [{ data: carType }, { data: carPackage }] = await Promise.all([
        supabase.from("car_types").select("name").eq("id", b.car_type_id).maybeSingle(),
        supabase.from("car_packages").select("duration_hours").eq("id", b.car_package_id).maybeSingle(),
      ]);
      carLabel = carType ? `${carType.name}${carPackage ? `, ${carPackage.duration_hours}h` : ""}` : null;
    }
  }

  // A pre-filled, no-recipient wa.me link -- opening it drops the admin
  // straight into WhatsApp's own "choose who to send this to" screen,
  // so they can pick the driver (or a driver group chat) from their
  // own contacts. There's no driver-contacts feature in this app, so
  // this is deliberately the whole mechanism: it never needs one.
  let driverMessageLink: string | null = null;
  if (b.pickup_datetime) {
    const area = [meetingPointName, b.meeting_point_custom].filter(Boolean).join(", ") || "Not set";
    const lines = [
      "New pickup:",
      `Trip: ${b.products?.title ?? "Trip"}`,
      `Booking: ${b.booking_code}`,
      `Pickup: ${new Date(b.pickup_datetime).toLocaleString()}`,
      carLabel ? `Car: ${carLabel}` : null,
      `Area: ${area}`,
      `Customer: ${b.customers?.name ?? "—"}`,
      b.pickup_whatsapp_number ? `Customer WhatsApp: ${b.pickup_whatsapp_number}` : null,
    ].filter((line): line is string => Boolean(line));
    driverMessageLink = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  return (
    <div className="max-w-xl">
      <Link href="/admin/bookings" className="text-sm font-semibold text-teal hover:underline">
        ← Back to Bookings
      </Link>

      <h1 className="mt-3 font-serif text-2xl font-semibold text-ink">
        {b.products?.title ?? "Trip"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Booking code <span className="font-semibold text-ink">{b.booking_code}</span> ·{" "}
        {BOOKING_STATUS_LABELS[b.status]}
      </p>

      {(travelerCount ?? 0) > 0 && (
        <p className="mt-4 rounded-lg border border-sand-deep bg-white p-3 text-sm">
          This is a manual-confirmation booking (spec §6b) --{" "}
          <Link href={`/admin/requests/${b.id}`} className="font-semibold text-teal hover:underline">
            view travelers, passports &amp; insurance in the request queue →
          </Link>
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
        <p className="font-semibold text-ink">Trip</p>
        <div className="mt-2 flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Trip date</span>
          <span className="text-ink">{b.slot_date}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Travelers</span>
          <span className="text-ink">{b.pax_count}</span>
        </div>
        {b.discount_code && b.discount_amount_usd > 0 && (
          <div className="flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Discount ({b.discount_code})</span>
            <span className="text-teal">-{formatUsd(b.discount_amount_usd)}</span>
          </div>
        )}
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">
            Total{b.status === "paid_confirmed" ? " paid" : ""}
          </span>
          <span className="font-semibold text-ink">{formatIdr(b.total_idr)}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-ink-soft">Purchase date</span>
          <span className="text-ink">{new Date(b.created_at).toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink">Customer</p>
          <form action={startCustomerConversationAction.bind(null, b.id)}>
            <button type="submit" className="text-sm font-semibold text-teal hover:underline">
              Message customer →
            </button>
          </form>
        </div>
        <p className="mt-2 text-ink">{b.customers?.name ?? "—"}</p>
        <p className="text-ink-soft">{b.customers?.email}</p>
        {b.customers?.phone && <p className="text-ink-soft">{b.customers.phone}</p>}
      </div>

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
        <p className="font-semibold text-ink">Pickup</p>
        {b.pickup_datetime ? (
          <>
            <p className="mt-2 text-ink">{new Date(b.pickup_datetime).toLocaleString()}</p>
            <p className="text-ink-soft">
              {[meetingPointName, b.meeting_point_custom].filter(Boolean).join(", ") || "—"}
              {carLabel && ` · ${carLabel}`}
            </p>
            {b.pickup_whatsapp_number && (
              <p className="mt-1 text-ink-soft">
                <a
                  href={`https://wa.me/${b.pickup_whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-teal underline"
                >
                  Message {b.pickup_whatsapp_number} on WhatsApp →
                </a>
              </p>
            )}
            {driverMessageLink && (
              <a
                href={driverMessageLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded-lg border border-sand-deep px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sand"
              >
                Send trip details to driver via WhatsApp →
              </a>
            )}
          </>
        ) : b.hotel_name || b.room_number ? (
          <>
            {b.hotel_name && <p className="mt-2 text-ink">{b.hotel_name}</p>}
            {b.room_number && <p className="text-ink-soft">Room {b.room_number}</p>}
          </>
        ) : (
          <p className="mt-2 text-ink-soft">Not provided at checkout.</p>
        )}
      </div>

      {b.sales_agents && (
        <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6 text-sm">
          <p className="font-semibold text-ink">Referral</p>
          <div className="mt-2 flex justify-between border-b border-sand-deep py-2">
            <span className="text-ink-soft">Agent</span>
            <span className="text-ink">
              {b.sales_agents.name} ({b.sales_agents.referral_code})
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-ink-soft">Commission</span>
            <span className="text-ink">
              {b.commission_amount_usd != null
                ? `${formatCommissionAmount(b.commission_amount_usd)} — ${
                    b.commission_status === "paid" ? "Paid" : "Pending"
                  }`
                : "Not confirmed yet"}
            </span>
          </div>
        </div>
      )}

      {b.xendit_invoice_url && (
        <a
          href={b.xendit_invoice_url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm font-semibold text-teal hover:underline"
        >
          View Xendit invoice →
        </a>
      )}
    </div>
  );
}
