import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAgentMessageAction } from "./actions";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatRealtimeRefresher } from "@/components/chat/ChatRealtimeRefresher";
import type { Message } from "@/lib/chat/types";

/**
 * Spec §6c: "A 'Support' tab in the agent dashboard ... a running
 * thread with your team, not a per-booking thread, since most agent
 * questions aren't tied to one specific sale." The "Ask about this"
 * product-card entry point from the same section is deliberately not
 * built -- there's no agent catalog view yet to attach it to (that's
 * still open from the original Phase 2 agent-dashboard scope); this
 * tab covers the actual conversation either way.
 */
export default async function AgentSupportPage() {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("agent_id", agent.id)
    .maybeSingle();

  let messages: Message[] = [];
  if (conversation) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    messages = (messageRows ?? []) as Message[];
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold text-ink">Support</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Questions about a sale, your application, or anything else -- message our team directly.
      </p>

      <div className="mt-6 rounded-2xl border border-sand-deep bg-white">
        <ChatThread messages={messages} viewerRole="agent" />
        <ChatComposer action={sendAgentMessageAction} />
      </div>
      {conversation && <ChatRealtimeRefresher conversationId={conversation.id} />}
    </div>
  );
}
