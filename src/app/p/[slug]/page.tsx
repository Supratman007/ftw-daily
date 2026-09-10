import type { Metadata } from "next";
import { ProductPage } from "@/components/pages/ProductPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: localizedAlternates(`/p/${slug}`, `/id/p/${slug}`) };
}

/** Thin English entrypoint -- see ProductPage for the real
 * implementation, shared with src/app/id/p/[slug]/page.tsx. */
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
  return <ProductPage params={params} searchParams={searchParams} locale="en" />;
}
