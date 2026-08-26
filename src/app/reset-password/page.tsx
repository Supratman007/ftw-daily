import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resetPasswordAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Reaching this page requires the recovery session /auth/callback
  // just established -- landing here with no session (link already
  // used, expired, or someone just typed the URL) means there's nothing
  // to reset yet.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("That reset link expired or was already used -- please request a new one.")}`
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Adventure Lombok Booking
      </p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">Set a new password</h1>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <form action={resetPasswordAction} className="mt-6 flex flex-col gap-3">
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="New password"
          className={inputClass}
        />
        <input
          name="confirm_password"
          type="password"
          required
          minLength={6}
          placeholder="Confirm new password"
          className={inputClass}
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Set new password
        </button>
      </form>
    </main>
  );
}
