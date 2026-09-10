import { notFound } from "next/navigation";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductTranslationReview } from "@/components/admin/ProductTranslationReview";
import { updateProductAction } from "../../actions";
import type { Product } from "@/lib/products/types";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; translation_saved?: string; retranslated?: string }>;
}) {
  await requireAdminSection("products");
  const { id } = await params;
  const { error, translation_saved, retranslated } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!product) {
    notFound();
  }
  const p = product as Product;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Edit product</h1>
      <ProductForm action={updateProductAction.bind(null, id)} product={p} error={error} />

      {translation_saved === "1" && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Indonesian translation saved and live on /id.
        </p>
      )}
      {retranslated === "1" && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Generated a fresh Indonesian draft below -- review it before approving.
        </p>
      )}
      <ProductTranslationReview product={p} />
    </div>
  );
}
