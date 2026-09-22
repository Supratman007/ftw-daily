import type { Metadata } from "next";
import { AboutPage } from "@/components/pages/AboutPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Tentang Kami | Adventure Lombok Booking",
    description:
      "Adventure Lombok adalah operator tur lokal Lombok yang menjalankan tur harian, trekking Gunung Rinjani, tur Gili Islands dan Komodo, serta sewa mobil sejak 2006.",
    path: "/id/about",
    enPath: "/about",
    idPath: "/id/about",
    imageUrl: "/logo.jpg",
  });
}

/** Thin Indonesian entrypoint -- see AboutPage for the real
 * implementation, shared with src/app/about/page.tsx. */
export default function Page() {
  return <AboutPage locale="id" />;
}
