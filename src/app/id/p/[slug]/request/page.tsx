import { RequestPage } from "@/components/pages/RequestPage";

/** Thin Indonesian entrypoint -- see RequestPage for the real
 * implementation, shared with src/app/p/[slug]/request/page.tsx
 * (English). */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; pax?: string; error?: string }>;
}) {
  return <RequestPage params={params} searchParams={searchParams} locale="id" />;
}
