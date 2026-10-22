import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/components/pages/PrivacyPolicyPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Kebijakan Privasi | Adventure Lombok Booking",
    description: "Kebijakan privasi Adventure Lombok Booking -- cara kami mengumpulkan, menggunakan, dan melindungi informasi Anda.",
    path: "/id/privacy",
    enPath: "/privacy",
    idPath: "/id/privacy",
    imageUrl: "/logo.jpg",
  });
}

export default function Page() {
  return <PrivacyPolicyPage locale="id" />;
}
