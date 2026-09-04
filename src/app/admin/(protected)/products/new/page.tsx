import { requireAdmin } from "@/lib/admin/auth";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProductAction } from "../actions";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Add product</h1>
      <ProductForm action={createProductAction} error={error} />
    </div>
  );
}
