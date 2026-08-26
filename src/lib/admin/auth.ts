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
