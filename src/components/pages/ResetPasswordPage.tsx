import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resetPasswordAction } from "@/app/reset-password/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

/** Shared by src/app/reset-password/page.tsx (English) and
 * src/app/id/reset-password/page.tsx (Indonesian). Same "staff/agents
 * only ever arrive via English" story as ForgotPasswordPage --
 * resetPasswordAction itself decides where a successful reset lands
 * (admin/agent dashboard vs. customer account) regardless of locale. */
export async function ResetPasswordPage({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ error?: string }>;
  locale: Locale;
}) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const { error } = await searchParams;
  const dict = getDictionary(locale).passwordReset;

  // Reaching this page requires the recovery session /auth/confirm just
  // established -- landing here with no session (link already used,
  // expired, or someone just typed the URL) means there's nothing to
  // reset yet.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`${pathPrefix}/forgot-password?error=${encodeURIComponent(dict.errors.linkExpired)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{dict.siteName}</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">{dict.resetHeading}</h1>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <form action={resetPasswordAction.bind(null, locale)} className="mt-6 flex flex-col gap-3">
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder={dict.newPasswordPlaceholder}
          className={inputClass}
        />
        <input
          name="confirm_password"
          type="password"
          required
          minLength={6}
          placeholder={dict.confirmNewPasswordPlaceholder}
          className={inputClass}
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          {dict.setNewPassword}
        </button>
      </form>
    </main>
  );
}
