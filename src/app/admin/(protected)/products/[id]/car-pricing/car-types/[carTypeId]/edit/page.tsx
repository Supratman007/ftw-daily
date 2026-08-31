import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CarTypeForm } from "@/components/admin/CarTypeForm";
import { updateCarTypeAction } from "../../../actions";
import type { CarType } from "@/lib/cars/types";

export default async function EditCarTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; carTypeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id: productId, carTypeId } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: carType } = await supabase
    .from("car_types")
    .select("*")
    .eq("id", carTypeId)
    .maybeSingle();

  if (!carType) {
    notFound();
  }

  return (
    <div>
      <Link href={`/admin/products/${productId}/car-pricing`} className="text-sm text-teal underline">
        ← Back to car pricing
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Edit car type</h1>
      <CarTypeForm
        action={updateCarTypeAction.bind(null, productId, carTypeId)}
        carType={carType as CarType}
        error={error}
      />
    </div>
  );
}
