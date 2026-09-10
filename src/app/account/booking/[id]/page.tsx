import { BookingDetailPage } from "@/components/pages/account/BookingDetailPage";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resent?: string; notice?: string; error?: string }>;
}) {
  return <BookingDetailPage params={params} searchParams={searchParams} locale="en" />;
}
