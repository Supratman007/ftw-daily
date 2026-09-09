import { HomePage } from "@/components/pages/HomePage";

/** Thin English entrypoint -- see HomePage for the real implementation,
 * shared with src/app/id/page.tsx. */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
}) {
  return <HomePage searchParams={searchParams} locale="en" />;
}
