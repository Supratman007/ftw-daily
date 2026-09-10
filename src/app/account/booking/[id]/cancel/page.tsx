import { RequestCancellationPage } from "@/components/pages/account/RequestCancellationPage";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return <RequestCancellationPage params={params} searchParams={searchParams} locale="en" />;
}
