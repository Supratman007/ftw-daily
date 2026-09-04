"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BuildTierRowResult =
  | { ok: true; row: { min_days_before_departure: number; refund_percent: number } }
  | { ok: false; error: string };

function buildTierRow(formData: FormData): BuildTierRowResult {
  const minDaysRaw = String(formData.get("min_days_before_departure") ?? "").trim();
  const refundPercentRaw = String(formData.get("refund_percent") ?? "").trim();
  const minDays = Number(minDaysRaw);
  const refundPercent = Number(refundPercentRaw);

  if (!minDaysRaw || !Number.isFinite(minDays) || minDays < 0) {
    return { ok: false, error: "Minimum days must be zero or a positive number." };
  }
  if (!refundPercentRaw || !Number.isFinite(refundPercent) || refundPercent < 0 || refundPercent > 100) {
    return { ok: false, error: "Refund percent must be between 0 and 100." };
  }

  return { ok: true, row: { min_days_before_departure: minDays, refund_percent: refundPercent } };
}

export async function createCancellationPolicyTierAction(formData: FormData) {
  await requireAdmin();
  const result = buildTierRow(formData);
  if (!result.ok) {
    redirect(`/admin/cancellations/policy/new?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("cancellation_policy_tiers").insert(result.row);
  if (error) {
    redirect(`/admin/cancellations/policy/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/cancellations/policy?saved=1");
}

export async function updateCancellationPolicyTierAction(tierId: string, formData: FormData) {
  await requireAdmin();
  const result = buildTierRow(formData);
  if (!result.ok) {
    redirect(`/admin/cancellations/policy/${tierId}/edit?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("cancellation_policy_tiers")
    .update(result.row)
    .eq("id", tierId);
  if (error) {
    redirect(`/admin/cancellations/policy/${tierId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/cancellations/policy?saved=1");
}

export async function deleteCancellationPolicyTierAction(tierId: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("cancellation_policy_tiers").delete().eq("id", tierId);
  if (error) {
    redirect(`/admin/cancellations/policy?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/cancellations/policy?deleted=1");
}
