import { ConfirmationPage } from "@/components/pages/ConfirmationPage";

/** Thin English entrypoint -- see ConfirmationPage for the real
 * implementation, shared with src/app/id/confirmation/[bookingId]/page.tsx. */
export default async function Page({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  return <ConfirmationPage params={params} locale="en" />;
}
