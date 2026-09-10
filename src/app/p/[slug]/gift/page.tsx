import type { Metadata } from "next";
import { GiftPurchasePage } from "@/components/pages/GiftPurchasePage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: localizedAlternates(`/p/${slug}/gift`, `/id/p/${slug}/gift`) };
}

/** Thin English entrypoint -- see GiftPurchasePage for the real
 * implementation, shared with src/app/id/p/[slug]/gift/page.tsx. */
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
  return <GiftPurchasePage params={params} searchParams={searchParams} locale="en" />;
}
