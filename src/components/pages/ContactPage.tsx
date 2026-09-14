import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { WHATSAPP_NUMBER, whatsappLink } from "@/lib/contact";
import { submitContactFormAction } from "@/app/contact/actions";
import type { Locale } from "@/lib/i18n/locales";

const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";

/**
 * Shared by src/app/contact/page.tsx (English) and
 * src/app/id/contact/page.tsx (Indonesian). A single message-us form
 * (see actions.ts) plus a direct WhatsApp link when one's configured
 * -- some visitors would rather message than fill in a form and wait
 * for an email reply.
 */
export async function ContactPage({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const { sent, error } = await searchParams;
  const action = submitContactFormAction.bind(null, locale);

  const t =
    locale === "id"
      ? {
          title: "Hubungi Kami",
          intro: "Ada pertanyaan tentang trip atau pemesanan Anda? Kirim pesan dan kami akan membalas secepatnya.",
          sent: "Pesan terkirim -- kami akan membalas ke email Anda secepatnya.",
          name: "Nama",
          email: "Email",
          message: "Pesan",
          send: "Kirim Pesan",
          orWhatsapp: "Atau hubungi kami langsung di WhatsApp:",
          messageOnWhatsapp: "Kirim pesan WhatsApp",
        }
      : {
          title: "Contact Us",
          intro: "Questions about a trip or your booking? Send a message and we'll get back to you.",
          sent: "Message sent -- we'll reply to your email shortly.",
          name: "Name",
          email: "Email",
          message: "Message",
          send: "Send Message",
          orWhatsapp: "Or reach us directly on WhatsApp:",
          messageOnWhatsapp: "Message us on WhatsApp",
        };

  return (
    <>
      <PageViewTracker path={`${pathPrefix}/contact`} locale={locale} />
      <SiteHeader locale={locale} localeSwitcherBasePath="/contact" />
      <main className="mx-auto max-w-lg px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Adventure Lombok Booking</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t.intro}</p>

        {sent && (
          <p className="mt-6 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">{t.sent}</p>
        )}
        {error && (
          <p className="mt-6 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
            {error}
          </p>
        )}

        {!sent && (
          <form action={action} className="mt-6 flex flex-col gap-4">
            {/* Honeypot -- hidden from real visitors, most bots fill it in
                anyway; see submitContactFormAction for what happens if
                it's non-empty. */}
            <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div>
              <label className={labelClass} htmlFor="name">
                {t.name}
              </label>
              <input id="name" name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">
                {t.email}
              </label>
              <input id="email" name="email" type="email" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="message">
                {t.message}
              </label>
              <textarea id="message" name="message" required rows={5} className={inputClass} />
            </div>

            <button
              type="submit"
              className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
            >
              {t.send}
            </button>
          </form>
        )}

        {WHATSAPP_NUMBER && (
          <div className="mt-10 border-t border-sand-deep pt-6">
            <p className="text-sm text-ink-soft">{t.orWhatsapp}</p>
            <a
              href={whatsappLink("Hi, I have a question about a trip.") ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded-lg border border-sand-deep px-4 py-2 text-sm font-semibold text-ink hover:bg-sand"
            >
              {t.messageOnWhatsapp}
            </a>
          </div>
        )}
      </main>
      <SiteFooter locale={locale} />
      <SiteCookieNotice locale={locale} />
    </>
  );
}
