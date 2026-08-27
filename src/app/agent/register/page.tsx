import Link from "next/link";
import { registerAgentAction } from "../actions";
import type { AgentType } from "@/lib/agents/types";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";
const fileHintClass = "mt-1 text-xs text-ink-soft";

export default async function AgentRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; type?: string }>;
}) {
  const { error, type } = await searchParams;
  const agentType: AgentType = type === "business" ? "business" : "personal";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Adventure Lombok Booking
      </p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ocean">Become a Sales Agent</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Get your own referral link and earn commission on trips you book for others. We&apos;ll
        review your application and documents before your link goes live.
      </p>

      <div className="mt-4 flex gap-2 rounded-lg border border-sand-deep bg-white p-1 text-sm">
        <Link
          href="/agent/register?type=personal"
          className={`flex-1 rounded-md py-1.5 text-center font-semibold ${
            agentType === "personal" ? "bg-coral text-white" : "text-ink-soft"
          }`}
        >
          Personal
        </Link>
        <Link
          href="/agent/register?type=business"
          className={`flex-1 rounded-md py-1.5 text-center font-semibold ${
            agentType === "business" ? "bg-coral text-white" : "text-ink-soft"
          }`}
        >
          Business
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <form
        action={registerAgentAction}
        encType="multipart/form-data"
        className="mt-6 flex flex-col gap-4"
      >
        <input type="hidden" name="agent_type" value={agentType} />

        <div>
          <label className={labelClass} htmlFor="name">
            Full name
          </label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className={inputClass}
          />
        </div>

        {agentType === "personal" ? (
          <div>
            <label className={labelClass} htmlFor="id_document">
              Selfie holding your KTP
            </label>
            <input
              id="id_document"
              name="id_document"
              type="file"
              accept="image/jpeg,image/png"
              required
              className={inputClass}
            />
            <p className={fileHintClass}>
              A photo of yourself holding your KTP next to your face, so we can verify it&apos;s
              you. JPG or PNG.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className={labelClass} htmlFor="business_document">
                Business license (NIB)
              </label>
              <input
                id="business_document"
                name="business_document"
                type="file"
                accept="image/jpeg,image/png"
                required
                className={inputClass}
              />
              <p className={fileHintClass}>A photo or scan of your NIB. JPG or PNG.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="pic_name">
                Person in charge (PIC) name
              </label>
              <input id="pic_name" name="pic_name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pic_phone">
                PIC contact number
              </label>
              <input id="pic_phone" name="pic_phone" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="id_document">
                PIC&apos;s ID card (KTP)
              </label>
              <input
                id="id_document"
                name="id_document"
                type="file"
                accept="image/jpeg,image/png"
                required
                className={inputClass}
              />
              <p className={fileHintClass}>A photo of the PIC&apos;s KTP. JPG or PNG.</p>
            </div>
          </>
        )}

        <button
          type="submit"
          className="mt-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Apply to become an agent
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-soft">
        Already an agent?{" "}
        <Link href="/agent/login" className="font-semibold text-teal hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
