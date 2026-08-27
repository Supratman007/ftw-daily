import { loginAction, signupAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; return_to?: string; error?: string; notice?: string }>;
}) {
  const { mode, return_to, error, notice } = await searchParams;
  const isSignup = mode === "signup";
  const returnTo = return_to ?? "/";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Adventure Lombok Booking
      </p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {isSignup ? "Takes less than a minute." : "Log in to continue."}
      </p>

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
        {isSignup && (
          <>
            <input name="full_name" required placeholder="Full name" className={inputClass} />
            <input name="phone" placeholder="Phone" className={inputClass} />
          </>
        )}
        <input name="email" type="email" required placeholder="Email" className={inputClass} />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Password"
          className={inputClass}
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          {isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      {!isSignup && (
        <p className="mt-3 text-center text-sm">
          <a href="/forgot-password" className="text-teal hover:underline">
            Forgot password?
          </a>
        </p>
      )}

      <p className="mt-4 text-center text-sm text-ink-soft">
        {isSignup ? "Already have an account? " : "New here? "}
        <a
          href={`/login?mode=${isSignup ? "login" : "signup"}&return_to=${encodeURIComponent(returnTo)}`}
          className="font-semibold text-teal hover:underline"
        >
          {isSignup ? "Log in" : "Create an account"}
        </a>
      </p>
    </main>
  );
}
