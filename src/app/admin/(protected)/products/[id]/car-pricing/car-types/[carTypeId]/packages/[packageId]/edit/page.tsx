import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CarPackageForm } from "@/components/admin/CarPackageForm";
import { updateCarPackageAction } from "../../../../../actions";
import type { CarPackage } from "@/lib/cars/types";

export default async function EditCarPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; carTypeId: string; packageId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id: productId, carTypeId, packageId } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: carPackage } = await supabase
    .from("car_packages")
    .select("*")
    .eq("id", packageId)
    .maybeSingle();

  if (!carPackage) {
    notFound();
  }

  return (
    <div>
      <Link href={`/admin/products/${productId}/car-pricing`} className="text-sm text-teal underline">
        ← Back to car pricing
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Edit duration package</h1>
      <CarPackageForm
        action={updateCarPackageAction.bind(null, productId, carTypeId, packageId)}
        carPackage={carPackage as CarPackage}
        error={error}
      />
    </div>
  );
}
