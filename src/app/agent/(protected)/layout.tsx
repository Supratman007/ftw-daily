import Link from "next/link";
import Image from "next/image";
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
      <header className="flex flex-col gap-3 border-b border-sand-deep bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <Link href="/agent" className="flex shrink-0 items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="Adventure Lombok Booking"
              width={120}
              height={36}
              className="h-8 w-auto sm:h-9"
            />
            <span className="font-mono text-xs uppercase tracking-widest text-ink-soft">Sales Agent</span>
          </Link>
          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-serif text-sm font-semibold text-ocean">
            <Link href="/agent">Overview</Link>
            <Link href="/agent/bookings">Sales report</Link>
            <Link href="/agent/support">Support</Link>
            <Link href="/agent/profile">Profile</Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
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
