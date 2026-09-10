import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/components/pages/PrivacyPolicyPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/privacy", "/id/privacy") };
}

export default function Page() {
  return <PrivacyPolicyPage locale="en" />;
}
