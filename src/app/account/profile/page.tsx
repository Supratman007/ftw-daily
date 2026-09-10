import { ProfilePage } from "@/components/pages/account/ProfilePage";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; password_error?: string; password_saved?: string }>;
}) {
  return <ProfilePage searchParams={searchParams} locale="en" />;
}
