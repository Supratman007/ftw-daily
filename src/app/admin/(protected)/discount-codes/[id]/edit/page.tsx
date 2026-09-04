import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DiscountCodeForm } from "@/components/admin/DiscountCodeForm";
import { updateDiscountCodeAction } from "../../actions";
import type { DiscountCode } from "@/lib/discounts/types";

export default async function EditDiscountCodePage({
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
  const { data: discountCode } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!discountCode) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Edit discount code</h1>
      <DiscountCodeForm
        action={updateDiscountCodeAction.bind(null, id)}
        discountCode={discountCode as DiscountCode}
        error={error}
      />
    </div>
  );
}
