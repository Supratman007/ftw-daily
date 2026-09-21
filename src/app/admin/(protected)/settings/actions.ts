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

/**
 * Self-service homepage hero -- same singleton row and reasoning as
 * updateExchangeRateAction above, for the fields added in migration
 * 0048_hero_settings.sql. Every field is optional: an empty string is
 * stored as null (getHeroContent() then falls back to the built-in
 * default copy/illustration for that field), so clearing a field and
 * saving reverts just that one piece rather than needing a separate
 * "reset" action.
 */
export async function updateHeroSettingsAction(formData: FormData) {
  const admin = await requireAdminSection("settings");

  function trimmedOrNull(field: string): string | null {
    const value = String(formData.get(field) ?? "").trim();
    return value || null;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      hero_image_url: trimmedOrNull("hero_image_url"),
      hero_badge_en: trimmedOrNull("hero_badge_en"),
      hero_badge_id: trimmedOrNull("hero_badge_id"),
      hero_headline_en: trimmedOrNull("hero_headline_en"),
      hero_headline_id: trimmedOrNull("hero_headline_id"),
      hero_subheadline_en: trimmedOrNull("hero_subheadline_en"),
      hero_subheadline_id: trimmedOrNull("hero_subheadline_id"),
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .eq("id", true);

  if (error) {
    redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/settings?heroSaved=1");
}
