import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { CarPackageForm } from "@/components/admin/CarPackageForm";
import { createCarPackageAction } from "../../../../actions";

export default async function NewCarPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; carTypeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id: productId, carTypeId } = await params;
  const { error } = await searchParams;

  return (
    <div>
      <Link href={`/admin/products/${productId}/car-pricing`} className="text-sm text-teal underline">
        ← Back to car pricing
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Add duration package</h1>
      <CarPackageForm action={createCarPackageAction.bind(null, productId, carTypeId)} error={error} />
    </div>
  );
}
