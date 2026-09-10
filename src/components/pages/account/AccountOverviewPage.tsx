import Link from "next/link";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr } from "@/lib/currency";
import type { Booking } from "@/lib/bookings/types";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

type BookingWithProduct = Booking & { products: { title: string; slug: string } | null };

/** Shared by src/app/account/page.tsx (English) and
 * src/app/id/account/page.tsx (Indonesian). Spec §6h Overview: "their
 * next upcoming trip surfaced prominently (if they have one), with
 * quick links into the other three sections below. Not meant to be
 * analyzed, just oriented." */
export async function AccountOverviewPage({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ password_reset?: string }>;
  locale: Locale;
}) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const customer = await requireCustomer(`${pathPrefix}/account`);
  const { password_reset } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const dict = getDictionary(locale).account.overview;

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
      <h1 className="font-serif text-2xl font-semibold text-ink">{dict.welcomeBack(customer.name)}</h1>

      {password_reset === "1" && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          {dict.passwordUpdated}
        </p>
      )}

      {b ? (
        <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-teal">{dict.yourNextTrip}</p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-ink">
            {b.products?.title ?? "Trip"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {b.slot_date} · {dict.travelerCount(b.pax_count)} · {formatIdr(b.total_idr)}
          </p>
          <Link
            href={`${pathPrefix}/account/booking/${b.id}`}
            className="mt-4 inline-block text-sm font-semibold text-teal hover:underline"
          >
            {dict.viewDetails}
          </Link>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-soft">
          {dict.noUpcomingTrips}{" "}
          <Link href={pathPrefix || "/"} className="text-teal hover:underline">
            {dict.browseTrips}
          </Link>{" "}
          {dict.toBookOne}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href={`${pathPrefix}/account/bookings`}
          className="rounded-2xl border border-sand-deep bg-white p-5 transition hover:shadow-md"
        >
          <p className="font-serif text-lg font-semibold text-ink">{dict.myBookingsCard}</p>
          <p className="mt-1 text-sm text-ink-soft">{dict.myBookingsCardDesc}</p>
        </Link>
        <Link
          href={`${pathPrefix}/account/profile`}
          className="rounded-2xl border border-sand-deep bg-white p-5 transition hover:shadow-md"
        >
          <p className="font-serif text-lg font-semibold text-ink">{dict.profileCard}</p>
          <p className="mt-1 text-sm text-ink-soft">{dict.profileCardDesc}</p>
        </Link>
      </div>
    </div>
  );
}
