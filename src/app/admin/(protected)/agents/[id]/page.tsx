import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { AGENT_STATUS_LABELS, AGENT_TYPE_LABELS, type SalesAgent } from "@/lib/agents/types";
import { updateAgentStatusAction } from "../actions";
import { startAgentConversationAction } from "../../inbox/actions";

const selectClass =
  "rounded-lg border border-sand-deep px-2 py-1 text-sm outline-none focus:border-teal";

// Signed URLs are short-lived on purpose -- these are private identity
// documents (KTP photos, business licenses); this link only needs to
// stay valid long enough for the page load that shows it.
const DOCUMENT_URL_TTL_SECONDS = 300;

export default async function AdminAgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("sales_agents")
    .select(
      "id, name, email, phone, referral_code, status, agent_type, pic_name, pic_phone, id_document_path, business_document_path, bank_name, bank_account_number, bank_account_holder, bank_change_requested_at, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const agent = data as SalesAgent;

  const serviceClient = createSupabaseServiceRoleClient();
  const [idDocUrl, businessDocUrl] = await Promise.all([
    agent.id_document_path
      ? serviceClient.storage
          .from("agent-documents")
          .createSignedUrl(agent.id_document_path, DOCUMENT_URL_TTL_SECONDS)
      : null,
    agent.business_document_path
      ? serviceClient.storage
          .from("agent-documents")
          .createSignedUrl(agent.business_document_path, DOCUMENT_URL_TTL_SECONDS)
      : null,
  ]);

  return (
    <div>
      <Link href="/admin/agents" className="text-sm font-semibold text-teal hover:underline">
        ← Back to Sales Agents
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">{agent.name}</h1>
        <div className="flex items-center gap-3">
          <form action={startAgentConversationAction.bind(null, agent.id)}>
            <button
              type="submit"
              className="rounded-lg border border-sand-deep px-3 py-1 text-xs font-semibold text-ink hover:bg-sand"
            >
              Message agent
            </button>
          </form>
          <form action={updateAgentStatusAction.bind(null, agent.id)} className="flex items-center gap-2">
            <select name="status" defaultValue={agent.status} className={selectClass}>
              {Object.entries(AGENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-teal px-3 py-1 text-xs font-semibold text-teal hover:bg-[#E3F2F1]"
            >
              Save
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sand-deep bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Application</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Type</dt>
              <dd className="font-semibold text-ink">{AGENT_TYPE_LABELS[agent.agent_type]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Email</dt>
              <dd className="text-ink">{agent.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Phone</dt>
              <dd className="text-ink">{agent.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Referral code</dt>
              <dd className="font-mono text-ink">{agent.referral_code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Applied</dt>
              <dd className="text-ink">{agent.created_at.slice(0, 10)}</dd>
            </div>
          </dl>
        </div>

        {agent.agent_type === "business" && (
          <div className="rounded-2xl border border-sand-deep bg-white p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
              Person in charge
            </p>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Name</dt>
                <dd className="font-semibold text-ink">{agent.pic_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Contact number</dt>
                <dd className="text-ink">{agent.pic_phone ?? "—"}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="rounded-2xl border border-sand-deep bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Payout bank account
          </p>
          {agent.bank_name ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Bank</dt>
                <dd className="font-semibold text-ink">{agent.bank_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Account number</dt>
                <dd className="font-mono text-ink">{agent.bank_account_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Account holder</dt>
                <dd className="text-ink">{agent.bank_account_holder}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">Not provided yet.</p>
          )}
          {agent.bank_change_requested_at &&
            new Date().getTime() - new Date(agent.bank_change_requested_at).getTime() <
              24 * 60 * 60 * 1000 && (
              <p className="mt-2 text-xs font-semibold text-coral-dark">
                A bank account change is pending the agent&apos;s email confirmation.
              </p>
            )}
        </div>
      </div>

      <h2 className="mt-8 font-serif text-lg font-semibold text-ink">Documents</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        {idDocUrl?.data?.signedUrl ? (
          <div className="rounded-2xl border border-sand-deep bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {agent.agent_type === "business" ? "PIC's ID card (KTP)" : "Selfie holding KTP"}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed
                Supabase Storage URL, not something next/image can optimize */}
            <img
              src={idDocUrl.data.signedUrl}
              alt="ID document"
              className="w-full rounded-lg border border-sand-deep"
            />
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No ID document on file.</p>
        )}
        {agent.agent_type === "business" &&
          (businessDocUrl?.data?.signedUrl ? (
            <div className="rounded-2xl border border-sand-deep bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Business license (NIB)
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed
                  Supabase Storage URL, not something next/image can optimize */}
              <img
                src={businessDocUrl.data.signedUrl}
                alt="Business license"
                className="w-full rounded-lg border border-sand-deep"
              />
            </div>
          ) : (
            <p className="text-sm text-ink-soft">No business license on file.</p>
          ))}
      </div>
    </div>
  );
}
