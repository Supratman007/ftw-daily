import Link from "next/link";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import type { Booking } from "@/lib/bookings/types";

type BookingWithProduct = Booking & { products: { title: string; slug: string } | null };

/** Spec §6h Overview: "their next upcoming trip surfaced prominently
 * (if they have one), with quick links into the other three sections
 * below. Not meant to be analyzed, just oriented." */
export default async function AccountOverviewPage() {
  const customer = await requireCustomer("/account");
  const supabase = await createSupabaseServerClient();

  const today = new Date().toISOString().slice(0, 10);
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("*, products(title, slug)")
    .eq("customer_id", customer.id)
    .eq("status", "paid_confirmed")
    .gte("slot_date", today)
    .order("slot_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const b = upcoming as BookingWithProduct | null;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Welcome back, {customer.name}</h1>

      {b ? (
        <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-teal">Your next trip</p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-ink">
            {b.products?.title ?? "Trip"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {b.slot_date} · {b.pax_count} traveler{b.pax_count === 1 ? "" : "s"} ·{" "}
            {formatIdr(b.total_idr)}
          </p>
          <Link
            href={`/account/booking/${b.id}`}
            className="mt-4 inline-block text-sm font-semibold text-teal hover:underline"
          >
            View details →
          </Link>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-soft">
          No upcoming trips yet.{" "}
          <Link href="/" className="text-teal hover:underline">
            Browse trips
          </Link>{" "}
          to book one.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/bookings"
          className="rounded-2xl border border-sand-deep bg-white p-5 transition hover:shadow-md"
        >
          <p className="font-serif text-lg font-semibold text-ink">My Bookings</p>
          <p className="mt-1 text-sm text-ink-soft">See all your upcoming and past trips.</p>
        </Link>
        <Link
          href="/account/profile"
          className="rounded-2xl border border-sand-deep bg-white p-5 transition hover:shadow-md"
        >
          <p className="font-serif text-lg font-semibold text-ink">Profile</p>
          <p className="mt-1 text-sm text-ink-soft">Update your name, email, and phone.</p>
        </Link>
      </div>
    </div>
  );
}
