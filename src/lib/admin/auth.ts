import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "reservations" | "accounting" | "support";
  status: "active" | "suspended";
}

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
