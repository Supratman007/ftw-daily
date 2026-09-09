import { requireAdminSection } from "@/lib/admin/auth";
import { CancellationPolicyTierForm } from "@/components/admin/CancellationPolicyTierForm";
import { createCancellationPolicyTierAction } from "../actions";

export default async function NewCancellationPolicyTierPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminSection("cancellation_policy");
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Add refund tier</h1>
      <CancellationPolicyTierForm action={createCancellationPolicyTierAction} error={error} />
    </div>
  );
}
