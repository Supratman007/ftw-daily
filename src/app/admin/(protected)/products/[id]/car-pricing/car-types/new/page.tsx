import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { CarTypeForm } from "@/components/admin/CarTypeForm";
import { createCarTypeAction } from "../../actions";

export default async function NewCarTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id: productId } = await params;
  const { error } = await searchParams;

  return (
    <div>
      <Link href={`/admin/products/${productId}/car-pricing`} className="text-sm text-teal underline">
        ← Back to car pricing
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Add car type</h1>
      <CarTypeForm action={createCarTypeAction.bind(null, productId)} error={error} />
    </div>
  );
}
