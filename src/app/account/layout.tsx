import { AccountShell } from "@/components/account/AccountShell";

/**
 * Spec §6h: Overview, My Bookings, and Profile are all Phase 1;
 * Messages (§6c's chat infra) is now built too. The saved-documents
 * part of Profile (depends on §6b's Rinjani upload) is deliberately
 * not here yet. Paired with src/app/id/account/layout.tsx -- same
 * "thin route wrapper, shared component" pattern as every other
 * locale pair in this app.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell locale="en">{children}</AccountShell>;
}
