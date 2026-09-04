"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BuildTierRowResult =
  | { ok: true; row: { name: string; min_referrals: number; commission_percent: number; sort_order: number } }
  | { ok: false; error: string };

/** sort_order exists on the table (display ordering) but doesn't
 * actually drive tier resolution -- resolveCommissionTier/
 * nextCommissionTier both sort by min_referrals themselves. Rather
 * than asking an admin to manage two overlapping numbers, this just
 * keeps sort_order equal to min_referrals so the column stays
 * populated and consistent without a form field for it. */
function buildTierRow(formData: FormData): BuildTierRowResult {
  const name = String(formData.get("name") ?? "").trim();
  const minReferralsRaw = String(formData.get("min_referrals") ?? "").trim();
  const commissionPercentRaw = String(formData.get("commission_percent") ?? "").trim();
  const minReferrals = Number(minReferralsRaw);
  const commissionPercent = Number(commissionPercentRaw);

  if (!name) {
    return { ok: false, error: "Tier name is required." };
  }
  if (!minReferralsRaw || !Number.isFinite(minReferrals) || minReferrals < 0) {
    return { ok: false, error: "Minimum referrals must be zero or a positive number." };
  }
  if (
    !commissionPercentRaw ||
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    return { ok: false, error: "Commission percent must be between 0 and 100." };
  }

  return {
    ok: true,
    row: {
      name,
      min_referrals: minReferrals,
      commission_percent: commissionPercent,
      sort_order: minReferrals,
    },
  };
}

export async function createCommissionTierAction(formData: FormData) {
  await requireAdmin();
  const result = buildTierRow(formData);
  if (!result.ok) {
    redirect(`/admin/commissions/tiers/new?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("commission_tiers").insert(result.row);
  if (error) {
    redirect(`/admin/commissions/tiers/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/commissions/tiers?saved=1");
}

export async function updateCommissionTierAction(tierId: string, formData: FormData) {
  await requireAdmin();
  const result = buildTierRow(formData);
  if (!result.ok) {
    redirect(`/admin/commissions/tiers/${tierId}/edit?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("commission_tiers").update(result.row).eq("id", tierId);
  if (error) {
    redirect(`/admin/commissions/tiers/${tierId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/commissions/tiers?saved=1");
}

export async function deleteCommissionTierAction(tierId: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("commission_tiers").delete().eq("id", tierId);
  if (error) {
    redirect(`/admin/commissions/tiers?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/commissions/tiers?deleted=1");
}
