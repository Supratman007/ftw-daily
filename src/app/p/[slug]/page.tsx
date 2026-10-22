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
  const title = product ? `${product.title} | Adventure Lombok Booking` : "Trip Not Found | Adventure Lombok Booking";
  const description =
    product?.excerpt ??
    (product
      ? `Book ${product.title} with Adventure Lombok Booking -- local Lombok tour operator since 2006, secure online payment.`
      : "This trip could not be found.");
  return pageMetadata({
    title,
    description,
    path: `/p/${slug}`,
    enPath: `/p/${slug}`,
    idPath: `/id/p/${slug}`,
    imageUrl: product?.cover_image_url,
  });
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
