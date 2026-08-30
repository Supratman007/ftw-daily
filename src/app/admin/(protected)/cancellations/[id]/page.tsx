import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { formatIdr } from "@/lib/currency";
import {
  CANCELLATION_PATH_LABELS,
  CANCELLATION_PREFERRED_RESOLUTION_LABELS,
  CANCELLATION_STATUS_LABELS,
  type CancellationRequest,
} from "@/lib/cancellations/types";
import {
  approveRefundAction,
  approveRescheduleAction,
  approveGiftVoucherAction,
  rejectCancellationRequestAction,
} from "../actions";

type RequestDetail = CancellationRequest & {
  bookings: {
    booking_code: string;
    slot_date: string;
    pax_count: number;
    total_idr: number;
    products: { title: string } | null;
    customers: { name: string; email: string; phone: string | null } | null;
  } | null;
};

const DOCUMENT_URL_TTL_SECONDS = 300;

export default async function AdminCancellationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; approved?: string; rejected?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, approved, rejected } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cancellation_requests")
    .select(
      "*, bookings(booking_code, slot_date, pax_count, total_idr, products(title), customers(name, email, phone))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const request = data as unknown as RequestDetail;

  let evidenceUrl: string | null = null;
  if (request.evidence_path) {
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: signed } = await serviceClient.storage
      .from("cancellation-evidence")
      .createSignedUrl(request.evidence_path, DOCUMENT_URL_TTL_SECONDS);
    evidenceUrl = signed?.signedUrl ?? null;
  }

  const isPending = request.status === "pending_review";

  return (
    <div className="max-w-xl">
      <Link href="/admin/cancellations" className="text-sm font-semibold text-teal hover:underline">
        ← Back to cancellations
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">
          {request.bookings?.products?.title ?? "Trip"}
        </h1>
        <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase text-ink-soft">
          {CANCELLATION_STATUS_LABELS[request.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {request.bookings?.booking_code} · {CANCELLATION_PATH_LABELS[request.path]}
      </p>
      {request.preferred_resolution && (
        <p className="mt-2 inline-block rounded-full bg-[#E3F2F1] px-3 py-1 text-xs font-semibold text-teal">
          Customer would like: {CANCELLATION_PREFERRED_RESOLUTION_LABELS[request.preferred_resolution]}
          {request.preferred_new_date && ` — new date: ${request.preferred_new_date}`}
        </p>
      )}

      {approved && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Approved -- the customer has been notified.
        </p>
      )}
      {rejected && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Rejected -- the customer has been notified.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-5 text-sm">
        <dl className="space-y-1">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Customer</dt>
            <dd className="text-ink">{request.bookings?.customers?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Email</dt>
            <dd className="text-ink">{request.bookings?.customers?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Trip date</dt>
            <dd className="text-ink">{request.bookings?.slot_date}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Total paid</dt>
            <dd className="text-ink">{formatIdr(request.bookings?.total_idr ?? 0)}</dd>
          </div>
          {request.path === "standard" && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">Calculated refund</dt>
              <dd className="font-semibold text-ink">
                {request.calculated_refund_percent}% ={" "}
                {formatIdr(request.calculated_refund_amount_idr ?? 0)}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-3 border-t border-sand-deep pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Customer&apos;s reason
          </p>
          <p className="mt-1 text-ink">{request.reason || "—"}</p>
        </div>

        {request.path === "force_majeure" && (
          <div className="mt-3 border-t border-sand-deep pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Supporting documentation
            </p>
            {evidenceUrl ? (
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-semibold text-teal hover:underline"
              >
                View document →
              </a>
            ) : (
              <p className="mt-1 text-coral-dark">No document on file.</p>
            )}
          </div>
        )}

        {request.status !== "pending_review" && request.admin_notes && (
          <div className="mt-3 border-t border-sand-deep pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Admin notes
            </p>
            <p className="mt-1 text-ink">{request.admin_notes}</p>
          </div>
        )}
      </div>

      {isPending && (
        <div className="mt-6 flex flex-col gap-6 rounded-2xl border border-sand-deep bg-white p-5">
          <p className="font-semibold text-ink">Decide</p>

          {request.path === "standard" && (
            <form action={approveRefundAction.bind(null, request.id)} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Refund</p>
              <textarea
                name="admin_notes"
                rows={2}
                placeholder="Internal notes (optional)"
                className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
              >
                Approve refund ({formatIdr(request.calculated_refund_amount_idr ?? 0)})
              </button>
            </form>
          )}

          <form
            action={approveRescheduleAction.bind(null, request.id)}
            className={`flex flex-col gap-2 ${request.path === "standard" ? "border-t border-sand-deep pt-4" : ""}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Reschedule{request.path === "force_majeure" ? " (no fee)" : ""}
            </p>
            <input
              type="date"
              name="new_slot_date"
              defaultValue={request.preferred_new_date ?? undefined}
              required
              className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
            />
            <textarea
              name="admin_notes"
              rows={2}
              placeholder="Internal notes (optional)"
              className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
            >
              Approve reschedule
            </button>
          </form>

          <form
            action={approveGiftVoucherAction.bind(null, request.id)}
            className="flex flex-col gap-2 border-t border-sand-deep pt-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Gift voucher -- transfer this trip to someone else
            </p>
            <input
              type="text"
              name="recipient_name"
              required
              defaultValue={request.bookings?.customers?.name ?? ""}
              placeholder="Recipient name"
              className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
            />
            <input
              type="text"
              name="recipient_contact"
              required
              defaultValue={request.bookings?.customers?.phone ?? request.bookings?.customers?.email ?? ""}
              placeholder="Recipient phone or email"
              className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
            />
            <label className="text-xs text-ink-soft">
              Voucher value (IDR)
              <input
                type="number"
                name="value_amount_idr"
                required
                min={1}
                step={1}
                defaultValue={
                  request.path === "standard"
                    ? request.calculated_refund_amount_idr ?? request.bookings?.total_idr ?? 0
                    : request.bookings?.total_idr ?? 0
                }
                className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm text-ink"
              />
            </label>
            <textarea
              name="admin_notes"
              rows={2}
              placeholder="Internal notes (optional)"
              className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="self-start rounded-lg border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-[#E3F2F1]"
            >
              Approve gift voucher
            </button>
          </form>

          <form
            action={rejectCancellationRequestAction.bind(null, request.id)}
            className="flex flex-col gap-2 border-t border-sand-deep pt-4"
          >
            <textarea
              name="admin_notes"
              rows={2}
              required
              placeholder="Reason for rejecting (shown to the customer)"
              className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="self-start rounded-lg border border-coral px-4 py-2 text-sm font-semibold text-coral-dark hover:bg-[#FCE6DD]"
            >
              Reject
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
