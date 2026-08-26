"use server";

import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import type { AdminRole } from "@/lib/admin/auth";

const ROLES: AdminRole[] = ["super_admin", "reservations", "accounting", "support"];

/**
 * Creates a real Supabase Auth account for a new staff member via
 * Supabase's invite-by-email (Admin API, service-role only -- there's
 * no self-service admin signup) and the matching admin_users row.
 * Supabase sends its own invite email with a set-password link -- same
 * infrastructure as the password-reset flow, reusing /auth/callback and
 * /reset-password rather than building a second flow.
 */
export async function inviteStaffAction(formData: FormData) {
  await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  function fail(message: string): never {
    redirect(`/admin/team/new?error=${encodeURIComponent(message)}`);
  }

  if (!name || !email) {
    fail("Name and email are required.");
  }
  if (!ROLES.includes(role as AdminRole)) {
    fail("Please choose a valid role.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
      data: { full_name: name },
    }
  );

  if (inviteError || !invited.user) {
    fail(inviteError?.message ?? "Couldn't send the invite.");
  }

  const { error: insertError } = await serviceClient.from("admin_users").insert({
    id: invited.user.id,
    name,
    email,
    role,
    status: "active",
  });

  if (insertError) {
    fail(`Invite sent, but couldn't create the admin record: ${insertError.message}`);
  }

  redirect("/admin/team?invited=1");
}

export async function updateStaffAction(staffId: string, formData: FormData) {
  const currentAdmin = await requireSuperAdmin();

  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "");

  function fail(message: string): never {
    redirect(`/admin/team?error=${encodeURIComponent(message)}`);
  }

  if (!ROLES.includes(role as AdminRole)) {
    fail("Invalid role.");
  }
  if (status !== "active" && status !== "suspended") {
    fail("Invalid status.");
  }
  // A super_admin locking out their own only super_admin account (by
  // suspending it or demoting it) would leave nobody able to fix it --
  // block editing your own row from this screen entirely.
  if (staffId === currentAdmin.id) {
    fail("You can't change your own role or status here.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("admin_users")
    .update({ role, status })
    .eq("id", staffId);

  if (error) {
    fail(error.message);
  }

  redirect("/admin/team?updated=1");
}
