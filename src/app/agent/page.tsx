import { requireAgent } from "@/lib/agents/auth";
import { agentLogoutAction } from "./actions";

/**
 * Stage 1 of the Sales Agent system: registration + admin approval.
 * Once approved, an agent's referral link/code exist and are shown
 * here, but nothing downstream reads them yet -- Stage 2 wires
 * referral attribution into checkout, and Stage 3 replaces this single
 * status page with a real dashboard (referred bookings, earnings).
 */
export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ password_set?: string }>;
}) {
  const agent = await requireAgent();
  const { password_set } = await searchParams;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const referralLink = `${siteUrl}/?ref=${agent.referral_code}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          Adventure Lombok Booking — Sales Agent
        </p>
        <form action={agentLogoutAction}>
          <button type="submit" className="text-sm font-semibold text-coral-dark hover:underline">
            Log out
          </button>
        </form>
      </div>

      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Welcome, {agent.name}</h1>

      {password_set === "1" && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Your password has been set. Welcome!
        </p>
      )}

      {agent.status === "pending" && (
        <p className="mt-4 rounded-lg border border-sand-deep bg-white p-4 text-sm text-ink-soft">
          Your application is under review. We&apos;ll let you know once you&apos;re approved --
          your referral link isn&apos;t active yet.
        </p>
      )}

      {agent.status === "suspended" && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-4 text-sm text-coral-dark">
          Your account has been suspended. Contact us if you think this is a mistake.
        </p>
      )}

      {agent.status === "active" && (
        <div className="mt-6 rounded-2xl border border-sand-deep bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Your referral code
          </p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">{agent.referral_code}</p>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-ink-soft">
            Your referral link
          </p>
          <p className="mt-1 break-all font-mono text-sm text-teal">{referralLink}</p>
          <p className="mt-4 text-sm text-ink-soft">
            Referred bookings and earnings tracking are coming soon.
          </p>
        </div>
      )}
    </main>
  );
}
