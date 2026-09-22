import type { Metadata } from "next";
import { RedeemPage } from "@/components/pages/RedeemPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Tukarkan Voucher Hadiah | Adventure Lombok Booking",
    description: "Tukarkan voucher hadiah untuk perjalanan bersama Adventure Lombok Booking.",
    path: "/id/redeem",
    enPath: "/redeem",
    idPath: "/id/redeem",
    imageUrl: "/logo.jpg",
  });
}

/** Thin Indonesian entrypoint -- see RedeemPage for the real
 * implementation, shared with src/app/redeem/page.tsx (English). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; submitted?: string; error?: string }>;
}) {
  return <RedeemPage searchParams={searchParams} locale="id" />;
}
