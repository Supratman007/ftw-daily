import { GiftPurchasePage } from "@/components/pages/GiftPurchasePage";

/** Thin Indonesian entrypoint -- see GiftPurchasePage for the real
 * implementation, shared with src/app/p/[slug]/gift/page.tsx (English). */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    pax?: string;
    recipient_name?: string;
    recipient_email?: string;
    discount_code?: string;
    error?: string;
  }>;
}) {
  return <GiftPurchasePage params={params} searchParams={searchParams} locale="id" />;
}
