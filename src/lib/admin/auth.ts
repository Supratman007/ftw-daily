import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "super_admin" | "reservations" | "accounting" | "support";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "active" | "suspended";
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  reservations: "Reservations",
  accounting: "Accounting",
  support: "Support",
};

/**
 * The real admin check (src/proxy.ts only does the fast "is anyone
 * logged in" check). Call this at the top of every protected admin page
 * and every admin Server Action -- being logged in to Supabase Auth
 * isn't the same as being an admin; this confirms a matching, active row
 * exists in admin_users. Wrapped in React's cache() so calling it
 * multiple times in one request (layout + page + action) only hits the
 * database once.
 */
export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, name, email, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminUser || adminUser.status !== "active") {
    // A real Supabase login that isn't a recognized (or is a suspended)
    // admin -- sign them out rather than leaving a half-authenticated
    // session sitting around.
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_authorized");
  }

  return adminUser as AdminUser;
});

/**
 * Spec §6k names Super Admin as the role that manages "other admin
 * accounts and their roles." Call this instead of requireAdmin() on any
 * page/action that creates, edits, or lists staff accounts -- being an
 * active admin isn't enough for those, only super_admin is.
 */
export const requireSuperAdmin = cache(async (): Promise<AdminUser> => {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") {
    redirect("/admin?error=super_admin_only");
  }
  return admin;
});

/**
 * Spec §6k's narrower roles, finally enforced (previously every admin
 * page just called requireAdmin(), so any active admin -- regardless
 * of role -- could reach everything; fine for a solo Super Admin, not
 * once a second admin account exists). One section per admin route
 * group; every section not explicitly granted below defaults to
 * super_admin-only, since the spec only ever names a handful of
 * sections for Reservations/Accounting/Support and staying
 * conservative on the rest is safer than guessing.
 *
 * A few judgment calls where the spec doesn't spell out every route:
 * - Reports (spec §6k's "financial reports" for Accounting) is
 *   Super Admin + Accounting only -- it's revenue and refund totals,
 *   not day-to-day operations, so Reservations doesn't need it.
 * - Bookings is Accounting's transaction record -- each row's amount,
 *   status, and Xendit invoice link -- so both Reservations (day-to-day
 *   operations) and Accounting (financial reports) can open it. There's
 *   no separate "reports" page yet; this list plus the dashboard's
 *   revenue total are the reporting Accounting has today.
 * - Vouchers mixes an operational side (confirming redemptions) and a
 *   financial one (approving refunds) in one screen -- granted to both
 *   Reservations and Accounting rather than splitting the page.
 * - Cancellation *policy* (the refund-percentage schedule) is a
 *   financial setting, grouped with Accounting rather than the
 *   request queue itself.
 * - Agents, Products, Meeting points, and Discount codes aren't named
 *   under any role in the spec, so these were confirmed directly:
 *   Agents stays Super-Admin-only; Products and Discount codes are
 *   open to all three admin roles (Reservations + Accounting, since
 *   product/pricing and promo-code changes both affect what
 *   Reservations quotes customers and what Accounting reports on);
 *   Meeting points is open to Reservations too, since they already
 *   own day-to-day pickups.
 */
export type AdminSection =
  | "dashboard"
  | "requests"
  | "cancellations"
  | "cancellation_policy"
  | "moderation"
  | "inbox"
  | "bookings"
  | "reports"
  | "vouchers"
  | "commissions"
  | "commission_tiers"
  | "agents"
  | "products"
  | "meeting_points"
  | "discount_codes";

export const ADMIN_SECTION_ROLES: Record<AdminSection, AdminRole[]> = {
  dashboard: ["super_admin", "reservations", "accounting", "support"],
  requests: ["super_admin", "reservations"],
  cancellations: ["super_admin", "reservations"],
  cancellation_policy: ["super_admin", "accounting"],
  moderation: ["super_admin", "reservations"],
  inbox: ["super_admin", "reservations", "support"],
  bookings: ["super_admin", "reservations", "accounting"],
  reports: ["super_admin", "accounting"],
  vouchers: ["super_admin", "reservations", "accounting"],
  commissions: ["super_admin", "accounting"],
  commission_tiers: ["super_admin"],
  agents: ["super_admin"],
  products: ["super_admin", "reservations", "accounting"],
  meeting_points: ["super_admin", "reservations"],
  discount_codes: ["super_admin", "reservations", "accounting"],
};

export const requireAdminSection = cache(async (section: AdminSection): Promise<AdminUser> => {
  const admin = await requireAdmin();
  if (!ADMIN_SECTION_ROLES[section].includes(admin.role)) {
    redirect(`/admin?error=${encodeURIComponent("Your role doesn't have access to that section.")}`);
  }
  return admin;
});
