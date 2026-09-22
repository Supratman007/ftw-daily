import type { Metadata } from "next";
import { AboutPage } from "@/components/pages/AboutPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "About Us | Adventure Lombok Booking",
    description:
      "Adventure Lombok is a local Lombok tour operator running day tours, Mount Rinjani treks, Gili Islands and Komodo trips, and car hire since 2006.",
    path: "/about",
    enPath: "/about",
    idPath: "/id/about",
    imageUrl: "/logo.jpg",
  });
}

/** Thin English entrypoint -- see AboutPage for the real
 * implementation, shared with src/app/id/about/page.tsx. */
export default function Page() {
  return <AboutPage locale="en" />;
}
