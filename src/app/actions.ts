"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/locales";

/** Customer-side logout -- mirrors the admin one in
 * admin/(protected)/actions.ts, just without the admin-only guard.
 * `locale` is bound by AccountShell (it already knows which locale
 * rendered the page), not read off a hidden field, so logging out
 * lands back on the homepage in the same language rather than always
 * bouncing to English. */
export async function customerLogoutAction(locale?: Locale) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(locale === "id" ? "/id" : "/");
}
