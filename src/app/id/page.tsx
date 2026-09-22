import type { Metadata } from "next";
import { HomePage } from "@/components/pages/HomePage";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getHeroContent } from "@/lib/heroSettings";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getHeroContent("id");
  return pageMetadata({
    title: "Tur, Aktivitas & Sewa Mobil Lombok | Adventure Lombok",
    description:
      "Pesan tur, aktivitas, trekking Rinjani, dan sewa mobil di Lombok secara online. Operator lokal sejak 2006, ketersediaan real-time, pembayaran aman.",
    path: "/id",
    enPath: "/",
    idPath: "/id",
    imageUrl: hero.imageUrl,
  });
}

/** Thin Indonesian entrypoint -- see HomePage for the real
 * implementation, shared with src/app/page.tsx (English). Reached
 * either by a browser-language auto-redirect or the language switcher
 * (see src/proxy.ts). */
export default async function IndonesianHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
}) {
  return <HomePage searchParams={searchParams} locale="id" />;
}
