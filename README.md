# Adventure Lombok Booking

Booking platform for Adventure Lombok Tour, to be hosted at
`booking.adventure-lombok.com`.

- **Reference docs:** [`docs/adventure-lombok-booking-spec.md`](docs/adventure-lombok-booking-spec.md)
  (full product/technical spec) and
  [`docs/adventure-lombok-booking-prototype.jsx`](docs/adventure-lombok-booking-prototype.jsx)
  (clickable UX prototype — not part of the app, kept for reference only).
- **Current scope:** Phase 1 only (see spec §12) — WordPress catalog sync,
  product catalog UI, customer accounts, Xendit checkout (sandbox), booking
  confirmation, and the account dashboard. Agents, Rinjani's request-to-book
  flow, reviews, chat, Car Hire, Transport, and cancellations are later
  phases — not built yet.

## Tech stack

- **Next.js** (App Router, TypeScript) — frontend + backend
- **Supabase** — Postgres database, Auth, Storage
- **Vercel** — hosting + scheduled jobs (Vercel Cron)
- **Xendit** — payments (sandbox/test mode for now)

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See `.env.local.example` for the environment variables this project needs
and where each one comes from.
