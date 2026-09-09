import { loginAction, signupAction } from "@/app/login/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

/**
 * Shared by src/app/login/page.tsx (English) and
 * src/app/id/login/page.tsx (Indonesian), same "one implementation,
 * two thin route entrypoints" pattern as the other translated pages.
 * The mode-toggle link ("Create an account" / "Log in") and forgot-
 * password link stay on this same page's own address -- see loginPath
 * below -- but /forgot-password itself isn't translated yet, so that
 * one link always points at the English page regardless of locale.
 */
export async function LoginPage({
  searchParams,
  locale,
}: {
  searchParams: Promise<{
    mode?: string;
    return_to?: string;
    error?: string;
    notice?: string;
    email?: string;
  }>;
  locale: Locale;
}) {
  const dict = getDictionary(locale).login;
  const { mode, return_to, error, notice, email } = await searchParams;
  const isSignup = mode === "signup";
  const loginPath = locale === "id" ? "/id/login" : "/login";
  const returnTo = return_to ?? (locale === "id" ? "/id" : "/");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Adventure Lombok Booking
      </p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">
        {isSignup ? dict.createAccountHeading : dict.welcomeBackHeading}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {isSignup ? dict.createAccountSubtitle : dict.loginSubtitle}
      </p>
      {isSignup && email && <p className="mt-1 text-xs text-ink-soft">{dict.matchEmailNotice}</p>}

      {notice && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <form
        action={isSignup ? signupAction : loginAction}
        className="mt-6 flex flex-col gap-3"
      >
        <input type="hidden" name="return_to" value={returnTo} />
        <input type="hidden" name="locale" value={locale} />
        {isSignup && (
          <>
            <input name="full_name" required placeholder={dict.fullNamePlaceholder} className={inputClass} />
            <input name="phone" placeholder={dict.phonePlaceholder} className={inputClass} />
          </>
        )}
        <input
          name="email"
          type="email"
          required
          defaultValue={email}
          placeholder={dict.emailPlaceholder}
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder={dict.passwordPlaceholder}
          className={inputClass}
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          {isSignup ? dict.createAccountButton : dict.loginButton}
        </button>
      </form>

      {!isSignup && (
        <p className="mt-3 text-center text-sm">
          <a href="/forgot-password" className="text-teal hover:underline">
            {dict.forgotPassword}
          </a>
        </p>
      )}

      <p className="mt-4 text-center text-sm text-ink-soft">
        {isSignup ? dict.haveAccountPrompt : dict.newHerePrompt}
        <a
          href={`${loginPath}?mode=${isSignup ? "login" : "signup"}&return_to=${encodeURIComponent(returnTo)}`}
          className="font-semibold text-teal hover:underline"
        >
          {isSignup ? dict.loginLink : dict.signupLink}
        </a>
      </p>
    </main>
  );
}
