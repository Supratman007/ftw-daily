import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { SUPPORT_EMAIL } from "@/lib/contact";
import type { Locale } from "@/lib/i18n/locales";

const h2 = "mt-8 font-serif text-xl font-semibold text-ink";
const p = "mt-3 text-sm leading-relaxed text-ink-soft";
const li = "mt-1";

/** Shared by src/app/privacy/page.tsx (English) and
 * src/app/id/privacy/page.tsx (Indonesian). Written to describe
 * exactly what this app actually does -- checkout via Xendit, accounts
 * and storage via Supabase, transactional email via Resend, the
 * in-house visitor tracker -- rather than generic boilerplate.
 * Flagged to the user as something worth a proper legal review before
 * relying on it, same as any policy page; not a substitute for one. */
export function PrivacyPolicyPage({ locale }: { locale: Locale }) {
  const updated = "10 September 2026";

  const pathPrefix = locale === "id" ? "/id" : "";
  return (
    <>
      <PageViewTracker path={`${pathPrefix}/privacy`} locale={locale} />
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-2xl px-6 py-12">
        {locale === "id" ? (
          <IdContent updated={updated} />
        ) : (
          <EnContent updated={updated} />
        )}
      </main>
      <SiteFooter locale={locale} />
      <SiteCookieNotice locale={locale} />
    </>
  );
}

function EnContent({ updated }: { updated: string }) {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Adventure Lombok Booking</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-xs text-ink-soft">Last updated: {updated}</p>

      <p className={p}>
        This policy explains what information Adventure Lombok Booking collects when you browse this
        site or book a trip with us, why we collect it, and who we share it with. We keep this simple
        and specific to what this app actually does -- if something below is unclear, message us and
        we&apos;ll explain.
      </p>

      <h2 className={h2}>Information we collect</h2>
      <p className={p}>When you create an account or make a booking, we collect:</p>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>Your name, email address, and phone number.</li>
        <li className={li}>
          A WhatsApp number for Car Hire/Transport pickups, so your driver can reach you on the day.
        </li>
        <li className={li}>
          Booking details -- which trip, date, number of travelers, hotel/pickup information.
        </li>
        <li className={li}>
          For trips that legally require it (e.g. Mount Rinjani park permits), traveler names and a
          scanned passport page.
        </li>
        <li className={li}>
          Any message you send us through the in-app chat on your booking.
        </li>
      </ul>
      <p className={p}>
        We never see or store your full payment card details -- payment is handled entirely by our
        payment processor, Xendit (see &quot;Third parties&quot; below).
      </p>

      <h2 className={h2}>Cookies we use</h2>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>
          <strong>Sign-in session</strong> -- keeps you logged in between visits (set by our hosting
          provider, Supabase).
        </li>
        <li className={li}>
          <strong>Language preference</strong> -- remembers whether you&apos;re browsing in English or
          Indonesian.
        </li>
        <li className={li}>
          <strong>Referral tracking</strong> -- if you arrived via a Sales Agent&apos;s link, a cookie
          remembers that for 30 days so they&apos;re credited if you book.
        </li>
        <li className={li}>
          <strong>Anonymous visitor id</strong> -- a random id, not linked to your name or account,
          used only to count how many people view each page (see below).
        </li>
      </ul>

      <h2 className={h2}>Website analytics</h2>
      <p className={p}>
        We track basic visits to our public pages (which page, which language, and which outside site
        sent you here, if any) so we can see which trips get the most interest. This is entirely
        anonymous: we never record your name, email, exact location, or anything tied to who you are
        -- just an anonymous, randomly generated id that lets us tell &quot;one visitor looked at three
        pages&quot; apart from &quot;three different visitors each looked at one page.&quot; We don&apos;t
        track anything you do inside your signed-in account or our staff panels.
      </p>

      <h2 className={h2}>How we use your information</h2>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>To process your booking and payment, and send you a confirmation.</li>
        <li className={li}>
          To coordinate your trip -- pickup arrangements, park permits, and anything you message us
          about.
        </li>
        <li className={li}>To send booking-related emails (confirmations, updates, receipts).</li>
        <li className={li}>
          To credit the correct Sales Agent when a booking came through their referral link.
        </li>
        <li className={li}>To understand which trips and pages are most popular, so we can improve them.</li>
      </ul>
      <p className={p}>We don&apos;t sell your information to anyone, ever.</p>

      <h2 className={h2}>Third parties we share data with</h2>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>
          <strong>Xendit</strong> -- processes your payment. They see what&apos;s needed to charge you;
          we never see your card details ourselves.
        </li>
        <li className={li}>
          <strong>Supabase</strong> -- hosts our database and handles account sign-in. Your booking and
          account data is stored on their infrastructure.
        </li>
        <li className={li}>
          <strong>Resend</strong> -- delivers our transactional emails (confirmations, receipts,
          updates).
        </li>
        <li className={li}>
          <strong>Vercel</strong> -- hosts this website itself.
        </li>
      </ul>
      <p className={p}>
        We don&apos;t share your information with anyone else for marketing or advertising purposes.
      </p>

      <h2 className={h2}>How long we keep your information</h2>
      <p className={p}>
        We keep booking records as long as needed for accounting, tax, and legal purposes. You can ask
        us to delete your account and personal information at any time (see &quot;Your rights&quot;
        below); we&apos;ll do so except where we&apos;re required to keep certain records by law (e.g.
        financial records for completed bookings).
      </p>

      <h2 className={h2}>Your rights</h2>
      <p className={p}>
        You can ask us to show you what information we hold about you, correct anything that&apos;s
        wrong, or delete your account and data. Email us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        and we&apos;ll help.
      </p>

      <h2 className={h2}>Children</h2>
      <p className={p}>
        This site isn&apos;t directed at children, and accounts are for adults booking trips (children
        can of course be listed as travelers on a family booking).
      </p>

      <h2 className={h2}>Changes to this policy</h2>
      <p className={p}>
        If we make a meaningful change to this policy, we&apos;ll update the date at the top of this
        page.
      </p>

      <h2 className={h2}>Contact us</h2>
      <p className={p}>
        Questions about this policy or your data? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </>
  );
}

function IdContent({ updated }: { updated: string }) {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Adventure Lombok Booking</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">Kebijakan Privasi</h1>
      <p className="mt-2 text-xs text-ink-soft">Terakhir diperbarui: {updated}</p>

      <p className={p}>
        Kebijakan ini menjelaskan informasi apa yang dikumpulkan Adventure Lombok Booking saat Anda
        menjelajahi situs ini atau memesan perjalanan bersama kami, mengapa kami mengumpulkannya, dan
        dengan siapa kami membagikannya. Kami menjaga ini tetap sederhana dan spesifik sesuai apa yang
        sebenarnya dilakukan aplikasi ini -- jika ada yang kurang jelas, hubungi kami dan kami akan
        menjelaskannya.
      </p>

      <h2 className={h2}>Informasi yang kami kumpulkan</h2>
      <p className={p}>Saat Anda membuat akun atau melakukan pemesanan, kami mengumpulkan:</p>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>Nama, alamat email, dan nomor telepon Anda.</li>
        <li className={li}>
          Nomor WhatsApp untuk penjemputan Sewa Mobil/Transportasi, agar sopir dapat menghubungi Anda
          pada hari-H.
        </li>
        <li className={li}>
          Detail pemesanan -- perjalanan mana, tanggal, jumlah wisatawan, informasi hotel/penjemputan.
        </li>
        <li className={li}>
          Untuk perjalanan yang secara hukum memerlukannya (misalnya izin taman Gunung Rinjani), nama
          wisatawan dan pindaian halaman paspor.
        </li>
        <li className={li}>Pesan apa pun yang Anda kirim kepada kami melalui obrolan di dalam aplikasi pada pemesanan Anda.</li>
      </ul>
      <p className={p}>
        Kami tidak pernah melihat atau menyimpan detail kartu pembayaran lengkap Anda -- pembayaran
        sepenuhnya ditangani oleh prosesor pembayaran kami, Xendit (lihat &quot;Pihak ketiga&quot; di
        bawah).
      </p>

      <h2 className={h2}>Cookie yang kami gunakan</h2>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>
          <strong>Sesi masuk</strong> -- menjaga Anda tetap masuk antar kunjungan (diatur oleh penyedia
          hosting kami, Supabase).
        </li>
        <li className={li}>
          <strong>Preferensi bahasa</strong> -- mengingat apakah Anda menjelajah dalam bahasa Inggris
          atau Indonesia.
        </li>
        <li className={li}>
          <strong>Pelacakan referral</strong> -- jika Anda datang melalui tautan Sales Agent, sebuah
          cookie mengingat hal ini selama 30 hari agar mereka mendapat kredit jika Anda memesan.
        </li>
        <li className={li}>
          <strong>ID pengunjung anonim</strong> -- sebuah id acak, tidak terhubung dengan nama atau
          akun Anda, digunakan hanya untuk menghitung berapa banyak orang yang melihat setiap halaman
          (lihat di bawah).
        </li>
      </ul>

      <h2 className={h2}>Analitik situs web</h2>
      <p className={p}>
        Kami melacak kunjungan dasar ke halaman publik kami (halaman mana, bahasa mana, dan situs luar
        mana yang mengirim Anda ke sini, jika ada) sehingga kami dapat melihat perjalanan mana yang
        paling diminati. Ini sepenuhnya anonim: kami tidak pernah mencatat nama, email, lokasi pasti,
        atau apa pun yang terkait dengan identitas Anda -- hanya id anonim yang dibuat secara acak
        yang memungkinkan kami membedakan &quot;satu pengunjung melihat tiga halaman&quot; dari &quot;tiga
        pengunjung berbeda masing-masing melihat satu halaman.&quot; Kami tidak melacak apa pun yang
        Anda lakukan di dalam akun Anda yang sudah masuk atau di panel staf kami.
      </p>

      <h2 className={h2}>Bagaimana kami menggunakan informasi Anda</h2>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>Untuk memproses pemesanan dan pembayaran Anda, serta mengirimkan konfirmasi.</li>
        <li className={li}>
          Untuk mengoordinasikan perjalanan Anda -- pengaturan penjemputan, izin taman, dan apa pun
          yang Anda tanyakan kepada kami.
        </li>
        <li className={li}>Untuk mengirimkan email terkait pemesanan (konfirmasi, pembaruan, tanda terima).</li>
        <li className={li}>Untuk memberikan kredit kepada Sales Agent yang tepat saat pemesanan datang melalui tautan referral mereka.</li>
        <li className={li}>Untuk memahami perjalanan dan halaman mana yang paling populer, agar kami dapat meningkatkannya.</li>
      </ul>
      <p className={p}>Kami tidak pernah menjual informasi Anda kepada siapa pun.</p>

      <h2 className={h2}>Pihak ketiga yang berbagi data dengan kami</h2>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>
          <strong>Xendit</strong> -- memproses pembayaran Anda. Mereka melihat apa yang diperlukan
          untuk menagih Anda; kami sendiri tidak pernah melihat detail kartu Anda.
        </li>
        <li className={li}>
          <strong>Supabase</strong> -- menyimpan database kami dan menangani proses masuk akun. Data
          pemesanan dan akun Anda disimpan di infrastruktur mereka.
        </li>
        <li className={li}>
          <strong>Resend</strong> -- mengirimkan email transaksional kami (konfirmasi, tanda terima,
          pembaruan).
        </li>
        <li className={li}>
          <strong>Vercel</strong> -- menyediakan hosting untuk situs web ini sendiri.
        </li>
      </ul>
      <p className={p}>
        Kami tidak membagikan informasi Anda kepada pihak lain mana pun untuk keperluan pemasaran atau
        iklan.
      </p>

      <h2 className={h2}>Berapa lama kami menyimpan informasi Anda</h2>
      <p className={p}>
        Kami menyimpan catatan pemesanan selama diperlukan untuk keperluan akuntansi, pajak, dan
        hukum. Anda dapat meminta kami menghapus akun dan informasi pribadi Anda kapan saja (lihat
        &quot;Hak Anda&quot; di bawah); kami akan melakukannya kecuali kami diwajibkan menyimpan
        catatan tertentu oleh hukum (misalnya catatan keuangan untuk pemesanan yang telah selesai).
      </p>

      <h2 className={h2}>Hak Anda</h2>
      <p className={p}>
        Anda dapat meminta kami menunjukkan informasi apa yang kami miliki tentang Anda, memperbaiki
        apa pun yang salah, atau menghapus akun dan data Anda. Email kami di{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        dan kami akan membantu.
      </p>

      <h2 className={h2}>Anak-anak</h2>
      <p className={p}>
        Situs ini tidak ditujukan untuk anak-anak, dan akun ditujukan untuk orang dewasa yang memesan
        perjalanan (anak-anak tentu saja dapat dicantumkan sebagai wisatawan dalam pemesanan
        keluarga).
      </p>

      <h2 className={h2}>Perubahan pada kebijakan ini</h2>
      <p className={p}>
        Jika kami membuat perubahan signifikan pada kebijakan ini, kami akan memperbarui tanggal di
        bagian atas halaman ini.
      </p>

      <h2 className={h2}>Hubungi kami</h2>
      <p className={p}>
        Ada pertanyaan tentang kebijakan ini atau data Anda? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </>
  );
}
