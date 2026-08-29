import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendStaffMessageAction, resolveConversationAction, reopenConversationAction } from "../actions";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatRealtimeRefresher } from "@/components/chat/ChatRealtimeRefresher";
import type { Message } from "@/lib/chat/types";

type ConversationDetail = {
  id: string;
  kind: "customer_booking" | "agent_support";
  status: "open" | "resolved";
  booking_id: string | null;
  agent_id: string | null;
  bookings: { id: string; booking_code: string; customers: { name: string; email: string } | null; products: { title: string } | null } | null;
  sales_agents: { id: string; name: string; email: string; referral_code: string } | null;
};

export default async function AdminInboxThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; resolved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, resolved } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, kind, status, booking_id, agent_id, bookings(id, booking_code, customers(name, email), products(title)), sales_agents(id, name, email, referral_code)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const conversation = data as unknown as ConversationDetail;

  const { data: messageRows } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  const messages = (messageRows ?? []) as Message[];

  return (
    <div className="max-w-2xl">
      <Link href="/admin/inbox" className="text-sm font-semibold text-teal hover:underline">
        ← Back to inbox
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {conversation.kind === "agent_support"
              ? conversation.sales_agents?.name ?? "Agent"
              : conversation.bookings?.customers?.name ?? "Customer"}
          </h1>
          <p className="text-sm text-ink-soft">
            {conversation.kind === "agent_support" ? (
              <>Agent support · {conversation.sales_agents?.email}</>
            ) : (
              <>
                {conversation.bookings?.products?.title ?? "Trip"} ·{" "}
                {conversation.bookings?.booking_code} · {conversation.bookings?.customers?.email}
              </>
            )}
          </p>
        </div>
        {conversation.kind === "customer_booking" && conversation.bookings && (
          <Link
            href={`/admin/bookings/${conversation.bookings.id}`}
            className="text-sm font-semibold text-teal hover:underline"
          >
            View booking →
          </Link>
        )}
        {conversation.kind === "agent_support" && conversation.sales_agents && (
          <Link
            href={`/admin/agents/${conversation.sales_agents.id}`}
            className="text-sm font-semibold text-teal hover:underline"
          >
            View agent →
          </Link>
        )}
      </div>

      {resolved && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Marked resolved.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div className="mt-4 rounded-2xl border border-sand-deep bg-white">
        <div className="flex items-center justify-between border-b border-sand-deep px-4 py-2">
          <span className="text-xs font-semibold uppercase text-ink-soft">
            {conversation.status === "resolved" ? "Resolved" : "Open"}
          </span>
          {conversation.status === "resolved" ? (
            <form action={reopenConversationAction.bind(null, conversation.id)}>
              <button type="submit" className="text-xs font-semibold text-teal hover:underline">
                Reopen
              </button>
            </form>
          ) : (
            <form action={resolveConversationAction.bind(null, conversation.id)}>
              <button type="submit" className="text-xs font-semibold text-teal hover:underline">
                Mark resolved
              </button>
            </form>
          )}
        </div>
        <ChatThread messages={messages} viewerRole="staff" />
        <ChatComposer action={sendStaffMessageAction.bind(null, conversation.id)} />
      </div>
      <ChatRealtimeRefresher conversationId={conversation.id} />
    </div>
  );
}
