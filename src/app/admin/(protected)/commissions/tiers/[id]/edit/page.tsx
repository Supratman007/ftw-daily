import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CommissionTierForm } from "@/components/admin/CommissionTierForm";
import { updateCommissionTierAction } from "../../actions";
import type { CommissionTier } from "@/lib/agents/types";

export default async function EditCommissionTierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: tier } = await supabase
    .from("commission_tiers")
    .select("id, name, min_referrals, commission_percent, sort_order")
    .eq("id", id)
    .maybeSingle();

  if (!tier) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Edit commission tier</h1>
      <CommissionTierForm
        action={updateCommissionTierAction.bind(null, id)}
        tier={tier as CommissionTier}
        error={error}
      />
    </div>
  );
}
