import { requireAdmin } from "@/lib/admin/auth";
import { CommissionTierForm } from "@/components/admin/CommissionTierForm";
import { createCommissionTierAction } from "../actions";

export default async function NewCommissionTierPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Add commission tier</h1>
      <CommissionTierForm action={createCommissionTierAction} error={error} />
    </div>
  );
}
