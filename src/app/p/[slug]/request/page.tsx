import type { Metadata } from "next";
import { RequestPage } from "@/components/pages/RequestPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: localizedAlternates(`/p/${slug}/request`, `/id/p/${slug}/request`) };
}

/** Thin English entrypoint -- see RequestPage for the real
 * implementation, shared with src/app/id/p/[slug]/request/page.tsx. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; pax?: string; error?: string }>;
}) {
  return <RequestPage params={params} searchParams={searchParams} locale="en" />;
}
