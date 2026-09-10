import type { Metadata } from "next";
import { ConfirmationPage } from "@/components/pages/ConfirmationPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}): Promise<Metadata> {
  const { bookingId } = await params;
  return {
    alternates: localizedAlternates(`/confirmation/${bookingId}`, `/id/confirmation/${bookingId}`),
  };
}

/** Thin English entrypoint -- see ConfirmationPage for the real
 * implementation, shared with src/app/id/confirmation/[bookingId]/page.tsx. */
export default async function Page({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  return <ConfirmationPage params={params} locale="en" />;
}
