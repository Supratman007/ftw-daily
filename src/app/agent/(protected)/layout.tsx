import Link from "next/link";
import { requireAgent } from "@/lib/agents/auth";
import { agentLogoutAction } from "../actions";

export default async function ProtectedAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const agent = await requireAgent();

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center justify-between border-b border-sand-deep bg-white px-6 py-4 print:hidden">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Adventure Lombok Booking — Sales Agent
          </p>
          <nav className="mt-1 flex gap-4 font-serif text-sm font-semibold text-ocean">
            <Link href="/agent">Overview</Link>
            <Link href="/agent/bookings">Sales report</Link>
            <Link href="/agent/profile">Profile</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>{agent.name}</span>
          <form action={agentLogoutAction}>
            <button type="submit" className="font-semibold text-coral-dark hover:underline">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
