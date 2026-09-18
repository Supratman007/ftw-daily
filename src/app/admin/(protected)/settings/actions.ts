"use server";

import { redirect } from "next/navigation";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sole write path for the USD->IDR exchange rate (migration
 * 0046_app_settings.sql) -- lets the founder update it themselves from
 * /admin/settings instead of asking a developer to edit
 * src/lib/currency.ts and redeploy every time the real rate moves.
 * Super Admin only (see ADMIN_SECTION_ROLES.settings).
 */
export async function updateExchangeRateAction(formData: FormData) {
  const admin = await requireAdminSection("settings");

  const rateRaw = String(formData.get("usd_to_idr_rate") ?? "").trim();
  const rate = Number(rateRaw);
  if (!rateRaw || !Number.isFinite(rate) || rate <= 0) {
    redirect(`/admin/settings?error=${encodeURIComponent("Enter a rate greater than zero.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ usd_to_idr_rate: rate, updated_at: new Date().toISOString(), updated_by: admin.id })
    .eq("id", true);

  if (error) {
    redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/settings?saved=1");
}
