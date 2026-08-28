import Link from "next/link";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BOOKING_STATUS_LABELS, type Booking } from "@/lib/bookings/types";

type BookingWithProduct = Booking & { products: { title: string; slug: string } | null };

function BookingRow({ b }: { b: BookingWithProduct }) {
  return (
    <div className="flex items-center justify-between border-t border-sand-deep px-4 py-3 text-sm first:border-t-0">
      <div>
        <p className="font-semibold text-ink">{b.products?.title ?? "Trip"}</p>
        <p className="text-ink-soft">
          {b.booking_code} · {b.slot_date} · {BOOKING_STATUS_LABELS[b.status]}
        </p>
      </div>
      <Link href={`/account/booking/${b.id}`} className="font-semibold text-teal hover:underline">
        View details
      </Link>
    </div>
  );
}

/** Spec §6h My Bookings: "The list view stays lean. Each row shows just
 * the title, booking code, date, and status -- plus one link: 'View
 * details.'" Split into upcoming/past per spec's "upcoming/completed
 * cards," plus an Incomplete section (not in spec, added so a booking
 * that never finished paying doesn't just silently vanish). */
export default async function MyBookingsPage() {
  const customer = await requireCustomer("/account/bookings");
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("bookings")
    .select("*, products(title, slug)")
    .eq("customer_id", customer.id)
    .order("slot_date", { ascending: false });

  const bookings = (data ?? []) as BookingWithProduct[];
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = bookings.filter((b) => b.status === "paid_confirmed" && b.slot_date >= today);
  const past = bookings.filter((b) => b.status === "paid_confirmed" && b.slot_date < today);
  const incomplete = bookings.filter((b) => b.status !== "paid_confirmed");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">My Bookings</h1>

      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-ink">Upcoming</h2>
        <div className="mt-2 rounded-lg border border-sand-deep bg-white">
          {upcoming.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">No upcoming trips.</p>
          ) : (
            upcoming.map((b) => <BookingRow key={b.id} b={b} />)
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-ink">Past</h2>
        <div className="mt-2 rounded-lg border border-sand-deep bg-white">
          {past.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">No past trips yet.</p>
          ) : (
            past.map((b) => <BookingRow key={b.id} b={b} />)
          )}
        </div>
      </section>

      {incomplete.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-ink">Incomplete</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Bookings that never completed payment, or a request still awaiting review.
          </p>
          <div className="mt-2 rounded-lg border border-sand-deep bg-white">
            {incomplete.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
