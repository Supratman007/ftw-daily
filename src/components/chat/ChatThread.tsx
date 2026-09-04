import type { Message, MessageSender } from "@/lib/chat/types";

/**
 * Plain server-rendered message list -- no client JS of its own. A
 * message from `viewerRole` itself aligns right; every other sender
 * (whichever role, customer/agent/staff) aligns left -- there are only
 * ever two sides to a thread from a given viewer's seat, so this
 * doesn't need a per-sender lookup, just "is this mine or theirs."
 */
export function ChatThread({
  messages,
  viewerRole,
}: {
  messages: Message[];
  viewerRole: MessageSender;
}) {
  if (messages.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-ink-soft">
        No messages yet -- say hello below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((m) => {
        const isOwn = m.sender === viewerRole;
        return (
          <div key={m.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                isOwn ? "bg-coral text-white" : "bg-sand text-ink"
              }`}
            >
              {!isOwn && (
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide opacity-70">
                  {m.sender_name}
                </p>
              )}
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              {new Date(m.created_at).toLocaleString()}
            </p>
          </div>
        );
      })}
    </div>
  );
}
