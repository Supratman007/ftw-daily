import type { Metadata } from "next";
import { TermsPage } from "@/components/pages/TermsPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Syarat Layanan | Adventure Lombok Booking",
    description: "Syarat dan ketentuan Adventure Lombok Booking untuk memesan tur, aktivitas, dan sewa mobil secara online.",
    path: "/id/terms",
    enPath: "/terms",
    idPath: "/id/terms",
    imageUrl: "/logo.jpg",
  });
}

export default function Page() {
  return <TermsPage locale="id" />;
}
