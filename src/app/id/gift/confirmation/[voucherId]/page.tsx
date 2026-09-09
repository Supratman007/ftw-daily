import { GiftConfirmationPage } from "@/components/pages/GiftConfirmationPage";

/** Thin Indonesian entrypoint -- see GiftConfirmationPage for the real
 * implementation, shared with
 * src/app/gift/confirmation/[voucherId]/page.tsx (English). */
export default async function Page({
  params,
}: {
  params: Promise<{ voucherId: string }>;
}) {
  return <GiftConfirmationPage params={params} locale="id" />;
}
