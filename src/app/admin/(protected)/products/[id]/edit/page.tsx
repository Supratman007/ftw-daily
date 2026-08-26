import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProductAction } from "../../actions";
import type { Product } from "@/lib/products/types";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Edit product</h1>
      <ProductForm
        action={updateProductAction.bind(null, id)}
        product={product as Product}
        error={error}
      />
    </div>
  );
}
