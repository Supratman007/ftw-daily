import { LoginPage } from "@/components/pages/LoginPage";

/** Thin Indonesian entrypoint -- see LoginPage for the real
 * implementation, shared with src/app/login/page.tsx (English). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    return_to?: string;
    error?: string;
    notice?: string;
    email?: string;
  }>;
}) {
  return <LoginPage searchParams={searchParams} locale="id" />;
}
