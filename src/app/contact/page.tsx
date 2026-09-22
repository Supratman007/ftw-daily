import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/ContactPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Contact Us | Adventure Lombok Booking",
    description:
      "Get in touch with Adventure Lombok Booking -- questions about tours, activities, car hire, or an existing booking.",
    path: "/contact",
    enPath: "/contact",
    idPath: "/id/contact",
    imageUrl: "/logo.jpg",
  });
}

/** Thin English entrypoint -- see ContactPage for the real
 * implementation, shared with src/app/id/contact/page.tsx. */
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  return <ContactPage locale="en" searchParams={searchParams} />;
}
