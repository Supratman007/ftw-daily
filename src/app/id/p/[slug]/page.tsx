import type { Metadata } from "next";
import { ProductPage } from "@/components/pages/ProductPage";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getProductMeta } from "@/lib/products/getProductMeta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductMeta(slug);
  const useTranslation = product?.translation_status === "approved";
  const displayTitle = useTranslation && product?.title_id ? product.title_id : product?.title;
  const displayExcerpt = useTranslation && product?.excerpt_id ? product.excerpt_id : product?.excerpt;
  const title = displayTitle ? `${displayTitle} | Adventure Lombok Booking` : "Trip Tidak Ditemukan | Adventure Lombok Booking";
  const description =
    displayExcerpt ??
    (displayTitle
      ? `Pesan ${displayTitle} bersama Adventure Lombok Booking -- operator tur lokal Lombok sejak 2006, pembayaran online aman.`
      : "Trip ini tidak ditemukan.");
  return pageMetadata({
    title,
    description,
    path: `/id/p/${slug}`,
    enPath: `/p/${slug}`,
    idPath: `/id/p/${slug}`,
    imageUrl: product?.cover_image_url,
  });
}

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
