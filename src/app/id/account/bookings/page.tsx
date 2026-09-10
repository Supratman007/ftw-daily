import { MyBookingsPage } from "@/components/pages/account/MyBookingsPage";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  return <MyBookingsPage searchParams={searchParams} locale="id" />;
}
