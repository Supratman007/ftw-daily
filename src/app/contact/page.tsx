import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/ContactPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/contact", "/id/contact") };
}

/** Thin English entrypoint -- see ContactPage for the real
 * implementation, shared with src/app/id/contact/page.tsx. */
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  return <ContactPage locale="en" searchParams={searchParams} />;
}
