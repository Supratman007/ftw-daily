import { requestPasswordResetAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Adventure Lombok Booking
      </p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">Reset your password</h1>

      {sent ? (
        <p className="mt-4 text-sm text-ink-soft">
          If that email has an account, we&apos;ve sent a link to reset the password. Check your
          inbox.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>

          {error && (
            <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
              {error}
            </p>
          )}

          <form action={requestPasswordResetAction} className="mt-6 flex flex-col gap-3">
            <input name="email" type="email" required placeholder="Email" className={inputClass} />
            <button
              type="submit"
              className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
            >
              Send reset link
            </button>
          </form>
        </>
      )}

      <p className="mt-4 text-center text-sm text-ink-soft">
        <a href="/login" className="font-semibold text-teal hover:underline">
          Back to login
        </a>
      </p>
    </main>
  );
}
