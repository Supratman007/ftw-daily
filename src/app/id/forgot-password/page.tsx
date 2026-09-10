import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/components/pages/ForgotPasswordPage";
import { localizedAlternates } from "@/lib/i18n/metadata";

export function generateMetadata(): Metadata {
  return { alternates: localizedAlternates("/forgot-password", "/id/forgot-password") };
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  return <ForgotPasswordPage searchParams={searchParams} locale="id" />;
}
