import { ProductPage } from "@/components/pages/ProductPage";

/** Thin Indonesian entrypoint -- see ProductPage for the real
 * implementation, shared with src/app/p/[slug]/page.tsx (English). */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    date?: string;
    pax?: string;
    discount_code?: string;
    hotel_name?: string;
    room_number?: string;
    error?: string;
  }>;
}) {
  return <ProductPage params={params} searchParams={searchParams} locale="id" />;
}
