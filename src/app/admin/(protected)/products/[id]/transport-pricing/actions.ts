"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Transport pricing is a single-axis grid -- one price per meeting
 * point, no car type/duration involved. One field per meeting point,
 * named "price__<meetingPointId>". An emptied cell deletes that price. */
export async function saveTransportPricesAction(productId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const upserts: { product_id: string; meeting_point_id: string; price_idr: number }[] = [];
  const deletes: string[] = [];

  for (const [key, rawValue] of formData.entries()) {
    const match = key.match(/^price__(.+)$/);
    if (!match) continue;
    const meetingPointId = match[1];
    const value = String(rawValue).trim();
    if (value === "") {
      deletes.push(meetingPointId);
      continue;
    }
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) continue;
    upserts.push({ product_id: productId, meeting_point_id: meetingPointId, price_idr: price });
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("transport_prices")
      .upsert(upserts, { onConflict: "product_id,meeting_point_id" });
    if (error) {
      redirect(
        `/admin/products/${productId}/transport-pricing?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  for (const meetingPointId of deletes) {
    await supabase
      .from("transport_prices")
      .delete()
      .eq("product_id", productId)
      .eq("meeting_point_id", meetingPointId);
  }

  redirect(`/admin/products/${productId}/transport-pricing?saved=1`);
}
