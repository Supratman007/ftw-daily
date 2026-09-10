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

/** Thin Indonesian entrypoint -- see ConfirmationPage for the real
 * implementation, shared with src/app/confirmation/[bookingId]/page.tsx
 * (English). */
export default async function Page({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  return <ConfirmationPage params={params} locale="id" />;
}
