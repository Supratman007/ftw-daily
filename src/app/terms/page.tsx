import type { Metadata } from "next";
import { TermsPage } from "@/components/pages/TermsPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Terms of Service | Adventure Lombok Booking",
    description: "Adventure Lombok Booking's terms of service for booking tours, activities, and car hire online.",
    path: "/terms",
    enPath: "/terms",
    idPath: "/id/terms",
    imageUrl: "/logo.jpg",
  });
}

export default function Page() {
  return <TermsPage locale="en" />;
}
