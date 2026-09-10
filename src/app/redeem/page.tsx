import type { Metadata } from "next";
import { RedeemPage } from "@/components/pages/RedeemPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/redeem", "/id/redeem") };
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
