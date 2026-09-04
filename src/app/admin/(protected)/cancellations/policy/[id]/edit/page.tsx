import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CancellationPolicyTierForm } from "@/components/admin/CancellationPolicyTierForm";
import { updateCancellationPolicyTierAction } from "../../actions";
import type { CancellationPolicyTier } from "@/lib/cancellations/types";

export default async function EditCancellationPolicyTierPage({
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
    .from("cancellation_policy_tiers")
    .select("id, min_days_before_departure, refund_percent")
    .eq("id", id)
    .maybeSingle();

  if (!tier) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Edit refund tier</h1>
      <CancellationPolicyTierForm
        action={updateCancellationPolicyTierAction.bind(null, id)}
        tier={tier as CancellationPolicyTier}
        error={error}
      />
    </div>
  );
}
