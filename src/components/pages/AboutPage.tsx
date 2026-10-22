import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import type { Locale } from "@/lib/i18n/locales";

const h2 = "mt-8 font-serif text-xl font-semibold text-ink";
const p = "mt-3 text-sm leading-relaxed text-ink-soft";
const li = "mt-1";

/**
 * Shared by src/app/about/page.tsx (English) and
 * src/app/id/about/page.tsx (Indonesian) -- same "one implementation,
 * two thin route entrypoints" pattern as Terms/Privacy. Content is a
 * first draft grounded only in what's already established elsewhere
 * in this app (local operator since 2006, based in Lombok, the trip
 * categories this site actually sells) -- deliberately doesn't invent
 * team size, awards, or certifications this app has no record of.
 * Flagged to the user to review/edit, same as the legal pages.
 */
export function AboutPage({ locale }: { locale: Locale }) {
  const pathPrefix = locale === "id" ? "/id" : "";
  return (
    <>
      <PageViewTracker path={`${pathPrefix}/about`} locale={locale} />
      <SiteHeader locale={locale} localeSwitcherBasePath="/about" />
      <main className="mx-auto max-w-2xl px-6 py-12">
        {locale === "id" ? <IdContent /> : <EnContent />}
      </main>
      <SiteFooter locale={locale} />
      <SiteCookieNotice locale={locale} />
    </>
  );
}

function EnContent() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Adventure Lombok Booking</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">About Us</h1>

      <p className={p}>
        Adventure Lombok is a local tour operator based on Lombok, running trips since 2006. We
        started with day trips and treks around our home island and have grown from there --
        Mount Rinjani, the Gili Islands, and further afield to Komodo and Bali -- while staying a
        small, local operation rather than a booking platform reselling someone else&apos;s tours.
      </p>

      <h2 className={h2}>What we run</h2>
      <p className={p}>
        Day tours and activities, multi-day Mount Rinjani treks, Gili Islands trips, Komodo
        National Park excursions, Bali tours, and private car hire/airport transport around
        Lombok. Every trip on this site is one we or a vetted local partner actually operates --
        real availability, no overselling.
      </p>

      <h2 className={h2}>Booking with us</h2>
      <p className={p}>
        This site handles the whole booking end to end -- real-time availability, secure online
        payment, and a booking confirmation you can rely on, the same online-first booking
        experience travelers expect from a larger platform, from a team that actually knows the
        island.
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>Local guides who know these routes, not a call-center reselling someone else&apos;s tour.</li>
        <li className={li}>Instant confirmation on most trips; a manual review step only where a permit or quota genuinely requires it (Mount Rinjani).</li>
        <li className={li}>Direct WhatsApp contact with our team, not just a support ticket queue.</li>
      </ul>

      <h2 className={h2}>Get in touch</h2>
      <p className={p}>
        Questions before you book? Visit our{" "}
        <a href="/contact" className="text-teal hover:underline">
          Contact page
        </a>{" "}
        -- we&apos;re happy to help plan your trip.
      </p>
    </>
  );
}

function IdContent() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Adventure Lombok Booking</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">Tentang Kami</h1>

      <p className={p}>
        Adventure Lombok adalah operator tur lokal yang berbasis di Lombok, telah menjalankan
        perjalanan wisata sejak 2006. Kami memulai dengan tur harian dan trekking di sekitar pulau
        kami sendiri dan terus berkembang -- Gunung Rinjani, Gili Islands, hingga Komodo dan Bali
        -- sambil tetap menjadi operator lokal berskala kecil, bukan platform pemesanan yang
        menjual ulang tur milik orang lain.
      </p>

      <h2 className={h2}>Yang kami jalankan</h2>
      <p className={p}>
        Tur dan aktivitas harian, trekking Gunung Rinjani multi-hari, perjalanan Gili Islands,
        ekskursi Taman Nasional Komodo, tur Bali, serta sewa mobil pribadi/transportasi bandara di
        sekitar Lombok. Setiap trip di situs ini benar-benar kami atau mitra lokal terpercaya kami
        yang mengoperasikan -- ketersediaan nyata, tanpa overbooking.
      </p>

      <h2 className={h2}>Memesan bersama kami</h2>
      <p className={p}>
        Situs ini menangani seluruh proses pemesanan dari awal sampai akhir -- ketersediaan
        real-time, pembayaran online yang aman, dan konfirmasi pemesanan yang bisa Anda
        andalkan -- pengalaman pemesanan online yang diharapkan wisatawan dari platform besar,
        namun dari tim yang benar-benar memahami pulau ini.
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>Pemandu lokal yang memahami rute-rute ini, bukan call-center yang menjual ulang tur orang lain.</li>
        <li className={li}>Konfirmasi instan untuk sebagian besar trip; tinjauan manual hanya untuk trip yang memang memerlukan izin/kuota (Gunung Rinjani).</li>
        <li className={li}>Kontak langsung via WhatsApp dengan tim kami, bukan sekadar antrean tiket dukungan.</li>
      </ul>

      <h2 className={h2}>Hubungi kami</h2>
      <p className={p}>
        Ada pertanyaan sebelum memesan? Kunjungi{" "}
        <a href="/id/contact" className="text-teal hover:underline">
          halaman Kontak
        </a>{" "}
        kami -- kami dengan senang hati membantu merencanakan perjalanan Anda.
      </p>
    </>
  );
}
