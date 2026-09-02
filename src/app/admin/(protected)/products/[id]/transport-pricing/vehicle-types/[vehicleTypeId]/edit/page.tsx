import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TransportVehicleTypeForm } from "@/components/admin/TransportVehicleTypeForm";
import { updateTransportVehicleTypeAction } from "../../../actions";
import type { TransportVehicleType } from "@/lib/cars/types";

export default async function EditTransportVehicleTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; vehicleTypeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id: productId, vehicleTypeId } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: vehicleType } = await supabase
    .from("transport_vehicle_types")
    .select("*")
    .eq("id", vehicleTypeId)
    .maybeSingle();

  if (!vehicleType) {
    notFound();
  }

  return (
    <div>
      <Link href={`/admin/products/${productId}/transport-pricing`} className="text-sm text-teal underline">
        ← Back to transport pricing
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Edit vehicle/service type</h1>
      <TransportVehicleTypeForm
        action={updateTransportVehicleTypeAction.bind(null, productId, vehicleTypeId)}
        vehicleType={vehicleType as TransportVehicleType}
        error={error}
      />
    </div>
  );
}
