import { RedeemPage } from "@/components/pages/RedeemPage";

/** Thin Indonesian entrypoint -- see RedeemPage for the real
 * implementation, shared with src/app/redeem/page.tsx (English). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; submitted?: string; error?: string }>;
}) {
  return <RedeemPage searchParams={searchParams} locale="id" />;
}
