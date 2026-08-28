import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { formatIdr } from "@/lib/currency";
import { BOOKING_STATUS_LABELS, type Booking, type Traveler } from "@/lib/bookings/types";
import { confirmRequestAction, declineRequestAction, saveAdminNotesAction } from "../actions";

type RequestDetail = Booking & {
  products: { title: string } | null;
  customers: { name: string; email: string; phone: string | null } | null;
  sales_agents: { name: string; referral_code: string } | null;
};

// Same short-lived-signed-URL reasoning as agent verification documents
// (admin/agents/[id]) -- these are passports, exactly the kind of
// sensitive document that shouldn't have a long-lived link floating
// around.
const DOCUMENT_URL_TTL_SECONDS = 300;

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; confirmed?: string; declined?: string; notes_saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, confirmed, declined, notes_saved: notesSaved } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bookings")
    .select("*, products(title), customers(name, email, phone), sales_agents(name, referral_code)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const b = data as RequestDetail;

  const { data: travelerRows } = await supabase
    .from("travelers")
    .select("id, booking_id, full_name, passport_scan_path, insurance_type, insurance_number, insurance_company, insurance_fee_idr, created_at")
    .eq("booking_id", b.id)
    .order("created_at", { ascending: true });
  const travelers = (travelerRows ?? []) as Traveler[];

  const serviceClient = createSupabaseServiceRoleClient();
  const passportUrls = await Promise.all(
    travelers.map((t) =>
      t.passport_scan_path
        ? serviceClient.storage
            .from("booking-documents")
            .createSignedUrl(t.passport_scan_path, DOCUMENT_URL_TTL_SECONDS)
        : Promise.resolve(null)
    )
  );

  return (
    <div className="max-w-2xl">
      <Link href="/admin/requests" className="text-sm font-semibold text-teal hover:underline">
        ← Back to requests
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">{b.products?.title ?? "Trip"}</h1>
        <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase text-ink-soft">
          {BOOKING_STATUS_LABELS[b.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Booking code <span className="font-mono text-ink">{b.booking_code}</span>
      </p>

      {confirmed && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Confirmed -- payment link sent to the customer, expires in 24 hours.
        </p>
      )}
      {declined && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Declined -- the customer has been notified and capacity was released.
        </p>
      )}
      {notesSaved && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Notes saved.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sand-deep bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Trip</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Date</dt>
              <dd className="text-ink">{b.slot_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Travelers</dt>
              <dd className="text-ink">{b.pax_count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Total</dt>
              <dd className="font-semibold text-ink">{formatIdr(b.total_idr)}</dd>
            </div>
            {b.insurance_total_idr > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">Park insurance</dt>
                <dd className="text-ink">{formatIdr(b.insurance_total_idr)}</dd>
              </div>
            )}
            {(b.hotel_name || b.room_number) && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">Pickup</dt>
                <dd className="text-ink">
                  {b.hotel_name}
                  {b.room_number ? ` · Room ${b.room_number}` : ""}
                </dd>
              </div>
            )}
            {b.sales_agents && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">Referred by</dt>
                <dd className="text-ink">
                  {b.sales_agents.name} ({b.sales_agents.referral_code})
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl border border-sand-deep bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Customer</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Name</dt>
              <dd className="text-ink">{b.customers?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Email</dt>
              <dd className="text-ink">{b.customers?.email ?? "—"}</dd>
            </div>
            {b.customers?.phone && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">Phone</dt>
                <dd className="text-ink">{b.customers.phone}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">Travelers</h2>
      <div className="mt-2 flex flex-col gap-4">
        {travelers.map((t, i) => (
          <div key={t.id} className="rounded-2xl border border-sand-deep bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">{t.full_name}</p>
              {passportUrls[i]?.data?.signedUrl ? (
                <a
                  href={passportUrls[i]!.data!.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-teal hover:underline"
                >
                  View passport →
                </a>
              ) : (
                <span className="text-sm text-coral-dark">No passport on file</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {t.insurance_type === "park_provided"
                ? `Park insurance (${formatIdr(t.insurance_fee_idr)})`
                : `Own insurance -- ${t.insurance_company ?? "—"} (${t.insurance_number ?? "—"})`}
            </p>
          </div>
        ))}
        {travelers.length === 0 && (
          <p className="text-sm text-ink-soft">No traveler details on file.</p>
        )}
      </div>

      {b.status === "under_review" && (
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-sand-deep bg-white p-5">
          <p className="font-semibold text-ink">
            Check TNGR park permit availability, then decide:
          </p>
          <form action={confirmRequestAction.bind(null, b.id)}>
            <button
              type="submit"
              className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
            >
              Available -- confirm &amp; send payment link
            </button>
          </form>
          <form action={declineRequestAction.bind(null, b.id)} className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft" htmlFor="decline_reason">
              Decline reason (shown to the customer)
            </label>
            <textarea
              id="decline_reason"
              name="decline_reason"
              rows={2}
              placeholder="e.g. No park permits available for this date -- try a date a few days later."
              className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="self-start rounded-lg border border-coral px-4 py-2 text-sm font-semibold text-coral-dark hover:bg-[#FCE6DD]"
            >
              Unavailable -- decline
            </button>
          </form>
        </div>
      )}

      {b.status === "confirmed_awaiting_payment" && (
        <div className="mt-8 rounded-2xl border border-teal bg-[#E3F2F1] p-5 text-sm text-teal">
          <p>Payment link sent -- waiting for the customer to pay.</p>
          {b.confirmation_deadline && (
            <p className="mt-1 font-semibold">
              Expires {new Date(b.confirmation_deadline).toLocaleString()}
            </p>
          )}
          {b.xendit_invoice_url && (
            <a href={b.xendit_invoice_url} target="_blank" rel="noreferrer" className="mt-1 block underline">
              View payment link
            </a>
          )}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-sand-deep bg-white p-5">
        <p className="font-semibold text-ink">Internal notes</p>
        <p className="mt-1 text-xs text-ink-soft">Not visible to the customer.</p>
        <form action={saveAdminNotesAction.bind(null, b.id)} className="mt-3 flex flex-col gap-2">
          <textarea
            name="admin_notes"
            rows={3}
            defaultValue={b.admin_notes ?? ""}
            className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="self-start rounded-lg border border-sand-deep px-4 py-2 text-sm font-semibold text-ink hover:bg-sand"
          >
            Save notes
          </button>
        </form>
      </div>
    </div>
  );
}
