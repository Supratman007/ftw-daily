"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Customer-side logout -- mirrors the admin one in
 * admin/(protected)/actions.ts, just without the admin-only guard. */
export async function customerLogoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
