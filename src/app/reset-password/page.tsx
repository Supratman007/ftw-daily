import type { Metadata } from "next";
import { ResetPasswordPage } from "@/components/pages/ResetPasswordPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/reset-password", "/id/reset-password") };
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <ResetPasswordPage searchParams={searchParams} locale="en" />;
}
