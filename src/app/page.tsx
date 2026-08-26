export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        booking.adventure-lombok.com
      </p>
      <h1 className="font-serif text-3xl font-semibold text-ocean">
        Adventure Lombok Booking
      </h1>
      <p className="max-w-md text-sm text-ink-soft">
        Phase 1 is under construction. The admin product catalog is being
        built first — the customer-facing catalog, checkout, and account
        pages come next.
      </p>
    </main>
  );
}
