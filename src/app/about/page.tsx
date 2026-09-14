import type { Metadata } from "next";
import { AboutPage } from "@/components/pages/AboutPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/about", "/id/about") };
}

/** Thin English entrypoint -- see AboutPage for the real
 * implementation, shared with src/app/id/about/page.tsx. */
export default function Page() {
  return <AboutPage locale="en" />;
}
