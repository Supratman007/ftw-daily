import type { Metadata } from "next";
import { LoginPage } from "@/components/pages/LoginPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/login", "/id/login") };
}

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
