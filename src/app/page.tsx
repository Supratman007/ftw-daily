import type { Metadata } from "next";
import { HomePage } from "@/components/pages/HomePage";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getHeroContent } from "@/lib/heroSettings";

export async function generateMetadata(): Promise<Metadata> {
  // Reuses the admin-set hero photo (if any) as the link-preview image
  // -- same getHeroContent() call HomePage.tsx itself makes, deduped
  // within the request by React's cache() (see heroSettings.ts), so
  // this doesn't cost a second database round trip.
  const hero = await getHeroContent("en");
  return pageMetadata({
    title: "Lombok Tours, Activities & Car Hire | Adventure Lombok",
    description:
      "Book Lombok tours, activities, Rinjani treks and car hire online. Local operator since 2006, real-time availability, secure payment.",
    path: "/",
    enPath: "/",
    idPath: "/id",
    imageUrl: hero.imageUrl,
  });
}

/** Thin English entrypoint -- see HomePage for the real implementation,
 * shared with src/app/id/page.tsx. */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
}) {
  return <HomePage searchParams={searchParams} locale="en" />;
}
