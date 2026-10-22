import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/ContactPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Hubungi Kami | Adventure Lombok Booking",
    description:
      "Hubungi Adventure Lombok Booking -- pertanyaan seputar tur, aktivitas, sewa mobil, atau booking yang sudah ada.",
    path: "/id/contact",
    enPath: "/contact",
    idPath: "/id/contact",
    imageUrl: "/logo.jpg",
  });
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
