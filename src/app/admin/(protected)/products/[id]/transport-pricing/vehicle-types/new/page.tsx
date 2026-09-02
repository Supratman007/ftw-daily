import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { TransportVehicleTypeForm } from "@/components/admin/TransportVehicleTypeForm";
import { createTransportVehicleTypeAction } from "../../actions";

export default async function NewTransportVehicleTypePage({
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
      <Link href={`/admin/products/${productId}/transport-pricing`} className="text-sm text-teal underline">
        ← Back to transport pricing
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Add vehicle/service type</h1>
      <TransportVehicleTypeForm action={createTransportVehicleTypeAction.bind(null, productId)} error={error} />
    </div>
  );
}
