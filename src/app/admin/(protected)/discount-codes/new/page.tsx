import { requireAdmin } from "@/lib/admin/auth";
import { DiscountCodeForm } from "@/components/admin/DiscountCodeForm";
import { createDiscountCodeAction } from "../actions";

export default async function NewDiscountCodePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Add discount code</h1>
      <DiscountCodeForm action={createDiscountCodeAction} error={error} />
    </div>
  );
}
