import type { Metadata } from "next";
import { GiftConfirmationPage } from "@/components/pages/GiftConfirmationPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ voucherId: string }>;
}): Promise<Metadata> {
  const { voucherId } = await params;
  return {
    alternates: localizedAlternates(
      `/gift/confirmation/${voucherId}`,
      `/id/gift/confirmation/${voucherId}`
    ),
  };
}

/** Thin English entrypoint -- see GiftConfirmationPage for the real
 * implementation, shared with
 * src/app/id/gift/confirmation/[voucherId]/page.tsx. */
export default async function Page({
  params,
}: {
  params: Promise<{ voucherId: string }>;
}) {
  return <GiftConfirmationPage params={params} locale="en" />;
}
