/** Plain form, no client JS -- sending goes through a Server Action
 * bound to the conversation, same pattern as every other mutation in
 * this app. The message still appears instantly for the sender (a
 * normal form POST re-renders the page with the new row included);
 * ChatRealtimeRefresher is what makes it appear for anyone *else*
 * currently looking at the same thread without them refreshing. */
export function ChatComposer({
  action,
  placeholder = "Write a message…",
}: {
  action: (formData: FormData) => void | Promise<void>;
  placeholder?: string;
}) {
  return (
    <form action={action} className="flex gap-2 border-t border-sand-deep p-3">
      <input
        type="text"
        name="body"
        required
        placeholder={placeholder}
        autoComplete="off"
        className="flex-1 rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal"
      />
      <button
        type="submit"
        className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        Send
      </button>
    </form>
  );
}
