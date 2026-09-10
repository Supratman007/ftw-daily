import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation } from "./types";

/** Shared by both variants below: try to find the one conversation
 * this booking/agent already has, and if there isn't one yet, create
 * it. Runs on the caller's own session client (RLS-scoped), matching
 * this app's "a person's own dashboard uses narrow RLS, not
 * service-role" convention -- a customer/agent starting their own
 * thread is exactly that case. The plain select-then-insert (rather
 * than a single upsert) is deliberately simple: a genuine double-
 * submit race is vanishingly rare at this app's scale, and the unique
 * index on booking_id/agent_id (migration 0017) means a raced insert
 * fails loudly rather than silently duplicating a thread -- caught
 * below by falling back to one re-select. */
export interface GetOrCreateResult {
  conversation: Conversation;
  /** True only when this call is the one that actually created the
   * row -- callers use this to notify staff on a thread's first
   * message, not every message after it. */
  created: boolean;
}

async function getOrCreate(
  supabase: SupabaseClient,
  matchColumn: "booking_id" | "agent_id",
  matchValue: string,
  insertRow: Record<string, unknown>
): Promise<GetOrCreateResult> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq(matchColumn, matchValue)
    .maybeSingle();

  if (existing) return { conversation: existing as Conversation, created: false };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert(insertRow)
    .select("*")
    .single();

  if (created) return { conversation: created as Conversation, created: true };

  // Most likely cause of a failed insert here: another request for
  // the same booking/agent won the race in between the select and
  // insert above -- the row now exists, so pick it up instead of
  // failing outright.
  const { data: afterRace } = await supabase
    .from("conversations")
    .select("*")
    .eq(matchColumn, matchValue)
    .maybeSingle();

  if (afterRace) return { conversation: afterRace as Conversation, created: false };

  throw new Error(`Couldn't start conversation: ${error?.message ?? "unknown error"}`);
}

export async function getOrCreateBookingConversation(
  supabase: SupabaseClient,
  bookingId: string
): Promise<GetOrCreateResult> {
  return getOrCreate(supabase, "booking_id", bookingId, {
    kind: "customer_booking",
    booking_id: bookingId,
  });
}

export async function getOrCreateAgentSupportConversation(
  supabase: SupabaseClient,
  agentId: string
): Promise<GetOrCreateResult> {
  return getOrCreate(supabase, "agent_id", agentId, {
    kind: "agent_support",
    agent_id: agentId,
  });
}
