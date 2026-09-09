import { ConfirmationPage } from "@/components/pages/ConfirmationPage";

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
