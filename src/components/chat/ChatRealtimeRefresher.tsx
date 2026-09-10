"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * The one piece of client JS a chat thread needs. Renders nothing --
 * just opens a Supabase Realtime subscription for new rows on this
 * conversation and calls router.refresh() when one arrives, so the
 * actual message list (server-rendered, in ChatThread) picks it up on
 * the next server round-trip instead of duplicating rendering logic
 * client-side. Realtime only delivers rows the subscriber's own RLS
 * would let them SELECT anyway (migration 0017), and only fires at
 * all because `messages` was added to the supabase_realtime
 * publication there -- the one step that's silently a no-op if missed.
 */
export function ChatRealtimeRefresher({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  return null;
}
