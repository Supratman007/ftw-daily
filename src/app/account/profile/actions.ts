"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Email is deliberately not editable here -- changing it needs
 * Supabase's own email-change confirmation flow (a second verification
 * step), which is more than this pass needs; name/phone cover what
 * spec §6h calls Phase 1 for Profile. */
export async function updateProfileAction(formData: FormData) {
  const customer = await requireCustomer("/account/profile");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    redirect(`/account/profile?error=${encodeURIComponent("Name is required.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({ name, phone: phone || null })
    .eq("id", customer.id);

  if (error) {
    redirect(`/account/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/account/profile?saved=1");
}
