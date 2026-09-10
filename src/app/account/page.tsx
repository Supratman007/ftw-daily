import { AccountOverviewPage } from "@/components/pages/account/AccountOverviewPage";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ password_reset?: string }>;
}) {
  return <AccountOverviewPage searchParams={searchParams} locale="en" />;
}
