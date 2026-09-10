import Link from "next/link";
import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

/** Shared by src/app/forgot-password/page.tsx (English) and
 * src/app/id/forgot-password/page.tsx (Indonesian). This flow is also
 * reached by staff and Sales Agents (see reset-password/actions.ts's
 * role check) -- they only ever arrive via an English link (the
 * admin/agent login pages), so the Indonesian version only actually
 * gets used by a customer coming from /id/login. */
export async function ForgotPasswordPage({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
  locale: Locale;
}) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const { error, sent } = await searchParams;
  const dict = getDictionary(locale).passwordReset;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{dict.siteName}</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">{dict.forgotHeading}</h1>

      {sent ? (
        <p className="mt-4 text-sm text-ink-soft">{dict.checkYourEmail}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">{dict.forgotIntro}</p>

          {error && (
            <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
              {error}
            </p>
          )}

          <form action={requestPasswordResetAction.bind(null, locale)} className="mt-6 flex flex-col gap-3">
            <input name="email" type="email" required placeholder={dict.emailPlaceholder} className={inputClass} />
            <button
              type="submit"
              className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
            >
              {dict.sendResetLink}
            </button>
          </form>
        </>
      )}

      <p className="mt-4 text-center text-sm text-ink-soft">
        <Link href={`${pathPrefix}/login`} className="font-semibold text-teal hover:underline">
          {dict.backToLogin}
        </Link>
      </p>
    </main>
  );
}
