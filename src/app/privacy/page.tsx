import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/components/pages/PrivacyPolicyPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Privacy Policy | Adventure Lombok Booking",
    description: "Adventure Lombok Booking's privacy policy -- how we collect, use, and protect your information.",
    path: "/privacy",
    enPath: "/privacy",
    idPath: "/id/privacy",
    imageUrl: "/logo.jpg",
  });
}

export default function Page() {
  return <PrivacyPolicyPage locale="en" />;
}
