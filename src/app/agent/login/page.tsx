import Link from "next/link";
import { agentLoginAction } from "../actions";

const inputClass =
  "rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";

export default async function AgentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>;
}) {
  const { error, notice, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Adventure Lombok Booking
      </p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">Sales Agent sign in</h1>

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

      <form action={agentLoginAction} className="mt-6 flex flex-col gap-3">
        {next && <input type="hidden" name="next" value={next} />}
        <input name="email" type="email" required placeholder="Email" className={inputClass} />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className={inputClass}
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Sign in
        </button>
      </form>

      <p className="mt-3 text-center text-sm">
        <Link href="/forgot-password" className="text-teal hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href="/agent/register" className="font-semibold text-teal hover:underline">
          Become a Sales Agent
        </Link>
      </p>
    </main>
  );
}
