import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/ContactPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/contact", "/id/contact") };
}

/** Thin Indonesian entrypoint -- see ContactPage for the real
 * implementation, shared with src/app/contact/page.tsx. */
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  return <ContactPage locale="id" searchParams={searchParams} />;
}
