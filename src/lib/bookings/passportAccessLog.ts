import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Spec §13: a passport scan's access needs to be logged (who, which
 * traveler, when), not just stored privately. Called right after
 * /admin/requests/[id] generates a signed URL for a traveler's scan --
 * that's the real access-control moment (see migration 0051). Uses the
 * caller's own session client, relying on the insert RLS policy
 * (admin_id = auth.uid()), same "a person's own action writes through
 * their own session" convention as getOrCreateConversation. Never
 * throws -- a logging failure shouldn't block an admin from seeing a
 * passport they're entitled to see, only get reported server-side.
 */
export async function recordPassportAccess(
  supabase: SupabaseClient,
  adminId: string,
  travelerIds: string[]
): Promise<void> {
  if (travelerIds.length === 0) return;

  const { error } = await supabase
    .from("passport_access_log")
    .insert(travelerIds.map((travelerId) => ({ traveler_id: travelerId, admin_id: adminId })));

  if (error) {
    console.error("Couldn't record passport access:", error);
  }
}

export interface PassportAccessEntry {
  viewedAt: string;
  adminName: string;
}

/**
 * The access trail for a set of travelers, most recent first -- powers
 * the "viewed by / when" line next to each passport link so the log
 * is actually answerable from the page, not just a table nobody reads
 * until a dispute forces someone to query it by hand.
 */
export async function getPassportAccessLog(
  supabase: SupabaseClient,
  travelerIds: string[]
): Promise<Record<string, PassportAccessEntry[]>> {
  if (travelerIds.length === 0) return {};

  const { data } = await supabase
    .from("passport_access_log")
    .select("traveler_id, viewed_at, admin_users(name)")
    .in("traveler_id", travelerIds)
    .order("viewed_at", { ascending: false });

  const byTraveler: Record<string, PassportAccessEntry[]> = {};
  for (const row of (data ?? []) as unknown as {
    traveler_id: string;
    viewed_at: string;
    admin_users: { name: string } | null;
  }[]) {
    const entry = { viewedAt: row.viewed_at, adminName: row.admin_users?.name ?? "Unknown admin" };
    (byTraveler[row.traveler_id] ??= []).push(entry);
  }
  return byTraveler;
}
