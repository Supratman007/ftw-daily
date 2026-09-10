import type { Metadata } from "next";
import { LoginPage } from "@/components/pages/LoginPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/login", "/id/login") };
}

/** Thin English entrypoint -- see LoginPage for the real
 * implementation, shared with src/app/id/login/page.tsx. */
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
  return <LoginPage searchParams={searchParams} locale="en" />;
}
