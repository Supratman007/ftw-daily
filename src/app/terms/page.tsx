import type { Metadata } from "next";
import { TermsPage } from "@/components/pages/TermsPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/terms", "/id/terms") };
}

export default function Page() {
  return <TermsPage locale="en" />;
}
