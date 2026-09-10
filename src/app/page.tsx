import type { Metadata } from "next";
import { HomePage } from "@/components/pages/HomePage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/", "/id") };
}

/** Thin English entrypoint -- see HomePage for the real implementation,
 * shared with src/app/id/page.tsx. */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
}) {
  return <HomePage searchParams={searchParams} locale="en" />;
}
