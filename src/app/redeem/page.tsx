import type { Metadata } from "next";
import { RedeemPage } from "@/components/pages/RedeemPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Redeem a Gift Voucher | Adventure Lombok Booking",
    description: "Redeem a gift voucher for a trip with Adventure Lombok Booking.",
    path: "/redeem",
    enPath: "/redeem",
    idPath: "/id/redeem",
    imageUrl: "/logo.jpg",
  });
}

/** Thin English entrypoint -- see RedeemPage for the real
 * implementation, shared with src/app/id/redeem/page.tsx. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; submitted?: string; error?: string }>;
}) {
  return <RedeemPage searchParams={searchParams} locale="en" />;
}
