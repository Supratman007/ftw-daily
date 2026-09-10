import type { Metadata } from "next";
import { HomePage } from "@/components/pages/HomePage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/", "/id") };
}

/** Thin Indonesian entrypoint -- see HomePage for the real
 * implementation, shared with src/app/page.tsx (English). Reached
 * either by a browser-language auto-redirect or the language switcher
 * (see src/proxy.ts). */
export default async function IndonesianHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
}) {
  return <HomePage searchParams={searchParams} locale="id" />;
}
