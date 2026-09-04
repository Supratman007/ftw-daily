import { loginAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Couldn't sign you in — check your email and password.",
  not_authorized: "That account isn't set up as an admin.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Adventure Lombok Booking
      </p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">Admin sign in</h1>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {ERROR_MESSAGES[error] ?? "Something went wrong signing you in."}
        </p>
      )}

      <form action={loginAction} className="mt-6 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Sign in
        </button>
      </form>

      <p className="mt-3 text-center text-sm">
        <a href="/forgot-password" className="text-teal hover:underline">
          Forgot password?
        </a>
      </p>
    </main>
  );
}
