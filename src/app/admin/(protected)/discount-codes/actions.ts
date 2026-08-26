"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DiscountType } from "@/lib/discounts/types";

const DISCOUNT_TYPES: DiscountType[] = ["percent", "fixed_usd"];

type BuildDiscountCodeRowResult =
  | { ok: true; row: ReturnType<typeof toDiscountCodeRow> }
  | { ok: false; error: string };

function toDiscountCodeRow(formData: FormData, code: string, discountType: DiscountType, discountValue: number) {
  const maxUsesRaw = String(formData.get("max_uses") ?? "").trim();
  const expiresAtRaw = String(formData.get("expires_at") ?? "").trim();

  return {
    code,
    discount_type: discountType,
    discount_value: discountValue,
    max_uses: maxUsesRaw === "" ? null : Number(maxUsesRaw),
    // Date input gives just yyyy-mm-dd -- treat it as end-of-day so a
    // code is still usable on the expiry date itself, not cut off at
    // midnight that morning.
    expires_at: expiresAtRaw === "" ? null : `${expiresAtRaw}T23:59:59`,
    active: formData.get("active") === "on",
  };
}

/** Shared by create and update -- returns either a validated row ready
 * to insert/update, or an error string to show the admin back on the
 * form (never both). */
function buildDiscountCodeRow(formData: FormData): BuildDiscountCodeRowResult {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discountType = String(formData.get("discount_type") ?? "");
  const discountValueRaw = String(formData.get("discount_value") ?? "").trim();
  const discountValue = Number(discountValueRaw);

  if (!code) {
    return { ok: false, error: "Code is required." };
  }
  if (!DISCOUNT_TYPES.includes(discountType as DiscountType)) {
    return { ok: false, error: "Please choose a discount type." };
  }
  if (!discountValueRaw || !Number.isFinite(discountValue) || discountValue <= 0) {
    return { ok: false, error: "Discount value is required and must be a positive number." };
  }
  if (discountType === "percent" && discountValue > 100) {
    return { ok: false, error: "A percentage discount can't be more than 100." };
  }

  return { ok: true, row: toDiscountCodeRow(formData, code, discountType as DiscountType, discountValue) };
}

export async function createDiscountCodeAction(formData: FormData) {
  await requireAdmin();
  const result = buildDiscountCodeRow(formData);
  if (!result.ok) {
    redirect(`/admin/discount-codes/new?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("discount_codes").insert(result.row);
  if (error) {
    const message = error.code === "23505" ? "That code already exists." : error.message;
    redirect(`/admin/discount-codes/new?error=${encodeURIComponent(message)}`);
  }

  redirect("/admin/discount-codes");
}

export async function updateDiscountCodeAction(discountCodeId: string, formData: FormData) {
  await requireAdmin();
  const result = buildDiscountCodeRow(formData);
  if (!result.ok) {
    redirect(`/admin/discount-codes/${discountCodeId}/edit?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("discount_codes")
    .update(result.row)
    .eq("id", discountCodeId);
  if (error) {
    const message = error.code === "23505" ? "That code already exists." : error.message;
    redirect(`/admin/discount-codes/${discountCodeId}/edit?error=${encodeURIComponent(message)}`);
  }

  redirect("/admin/discount-codes");
}
