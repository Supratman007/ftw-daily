import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteCookieNotice } from "@/components/SiteCookieNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { SUPPORT_EMAIL } from "@/lib/contact";
import type { Locale } from "@/lib/i18n/locales";

const h2 = "mt-8 font-serif text-xl font-semibold text-ink";
const p = "mt-3 text-sm leading-relaxed text-ink-soft";
const li = "mt-1";

/** Shared by src/app/terms/page.tsx (English) and
 * src/app/id/terms/page.tsx (Indonesian). Describes the actual
 * cancellation fee schedule this app currently ships with by default
 * (0%/65%/90%, force majeure bypasses it) -- that schedule is
 * admin-configurable, so this deliberately also points to what's shown
 * at booking/cancellation time as the source of truth if it's ever
 * changed. Flagged to the user as something worth a proper legal
 * review, same as the Privacy Policy. */
export function TermsPage({ locale }: { locale: Locale }) {
  const updated = "10 September 2026";

  const pathPrefix = locale === "id" ? "/id" : "";
  return (
    <>
      <PageViewTracker path={`${pathPrefix}/terms`} locale={locale} />
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-2xl px-6 py-12">
        {locale === "id" ? <IdContent updated={updated} /> : <EnContent updated={updated} />}
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
      <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">Terms of Service</h1>
      <p className="mt-2 text-xs text-ink-soft">Last updated: {updated}</p>

      <p className={p}>
        These terms cover booking a trip through this website. By creating an account or completing a
        booking, you&apos;re agreeing to them.
      </p>

      <h2 className={h2}>Bookings and payment</h2>
      <p className={p}>
        Prices are shown in US dollars and Indonesian rupiah; payment is charged in rupiah. A booking
        is confirmed once payment is completed -- for most trips this is instant; a few (like Mount
        Rinjani) require us to manually confirm park permit availability first, in which case
        nothing is charged until we confirm and you complete payment.
      </p>

      <h2 className={h2}>Cancellations and refunds</h2>
      <p className={p}>
        You can request a cancellation or reschedule from your booking page at any time before your
        trip. Our current standard fee schedule is:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>2 or more days before departure: 90% refund.</li>
        <li className={li}>1 day before departure: 65% refund.</li>
        <li className={li}>Same-day or no-show: no refund.</li>
      </ul>
      <p className={p}>
        A staff member reviews and confirms every request before anything is actually refunded. For
        illness, emergencies, or other circumstances beyond your control (&quot;force majeure&quot;),
        this fee schedule doesn&apos;t apply -- instead we offer a free reschedule or a gift voucher
        for the full value, subject to review. The exact numbers above can change over time; the
        figure shown to you on your own booking&apos;s cancellation page at the time you request it is
        what actually applies.
      </p>

      <h2 className={h2}>Gift vouchers</h2>
      <p className={p}>
        A gift voucher can be redeemed for the trip it was issued for, by the date shown on the
        voucher. If you&apos;d like a refund on an unused voucher instead, you can request one from
        your account -- refund requests are reviewed the same way as a regular cancellation.
      </p>

      <h2 className={h2}>Your account</h2>
      <p className={p}>
        You&apos;re responsible for keeping your account credentials secure and for the accuracy of
        the information you give us (traveler names, contact details, pickup information) -- we rely
        on it to actually run your trip.
      </p>

      <h2 className={h2}>Sales Agents</h2>
      <p className={p}>
        If you&apos;re a Sales Agent, your commission terms, payout schedule, and referral code usage
        are governed by the separate agreement you accept when your application is approved, not by
        these general terms.
      </p>

      <h2 className={h2}>What we&apos;re responsible for</h2>
      <p className={p}>
        We arrange and coordinate the trips listed on this site. We&apos;re not responsible for
        circumstances outside our control that affect a trip once it&apos;s underway (weather, park
        closures, force majeure events) -- where those affect your trip, we&apos;ll work with you on
        rescheduling or another resolution as covered above.
      </p>

      <h2 className={h2}>Governing law</h2>
      <p className={p}>These terms are governed by the laws of Indonesia.</p>

      <h2 className={h2}>Changes to these terms</h2>
      <p className={p}>
        If we make a meaningful change to these terms, we&apos;ll update the date at the top of this
        page.
      </p>

      <h2 className={h2}>Contact us</h2>
      <p className={p}>
        Questions about these terms? Email{" "}
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
      <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">Syarat &amp; Ketentuan</h1>
      <p className="mt-2 text-xs text-ink-soft">Terakhir diperbarui: {updated}</p>

      <p className={p}>
        Ketentuan ini mencakup pemesanan perjalanan melalui situs web ini. Dengan membuat akun atau
        menyelesaikan pemesanan, Anda menyetujuinya.
      </p>

      <h2 className={h2}>Pemesanan dan pembayaran</h2>
      <p className={p}>
        Harga ditampilkan dalam dolar AS dan rupiah Indonesia; pembayaran ditagihkan dalam rupiah.
        Pemesanan dikonfirmasi setelah pembayaran selesai -- untuk sebagian besar perjalanan ini
        instan; beberapa perjalanan (seperti Gunung Rinjani) memerlukan konfirmasi manual dari kami
        atas ketersediaan izin taman terlebih dahulu, di mana tidak ada biaya yang dikenakan sampai
        kami mengonfirmasi dan Anda menyelesaikan pembayaran.
      </p>

      <h2 className={h2}>Pembatalan dan pengembalian dana</h2>
      <p className={p}>
        Anda dapat mengajukan pembatalan atau penjadwalan ulang dari halaman pemesanan Anda kapan saja
        sebelum perjalanan Anda. Jadwal biaya standar kami saat ini adalah:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
        <li className={li}>2 hari atau lebih sebelum keberangkatan: pengembalian dana 90%.</li>
        <li className={li}>1 hari sebelum keberangkatan: pengembalian dana 65%.</li>
        <li className={li}>Hari yang sama atau tidak hadir: tidak ada pengembalian dana.</li>
      </ul>
      <p className={p}>
        Staf kami meninjau dan mengonfirmasi setiap permintaan sebelum ada dana yang benar-benar
        dikembalikan. Untuk sakit, keadaan darurat, atau keadaan lain di luar kendali Anda (&quot;force
        majeure&quot;), jadwal biaya ini tidak berlaku -- sebagai gantinya kami menawarkan penjadwalan
        ulang gratis atau voucher hadiah senilai penuh, tergantung peninjauan. Angka-angka di atas
        dapat berubah seiring waktu; angka yang ditampilkan kepada Anda di halaman pembatalan
        pemesanan Anda sendiri pada saat Anda mengajukan permintaan adalah yang sebenarnya berlaku.
      </p>

      <h2 className={h2}>Voucher hadiah</h2>
      <p className={p}>
        Voucher hadiah dapat ditukarkan untuk perjalanan yang tercantum di dalamnya, sebelum tanggal
        yang tertera pada voucher. Jika Anda ingin pengembalian dana untuk voucher yang belum
        digunakan, Anda dapat mengajukan permintaan dari akun Anda -- permintaan pengembalian dana
        ditinjau dengan cara yang sama seperti pembatalan biasa.
      </p>

      <h2 className={h2}>Akun Anda</h2>
      <p className={p}>
        Anda bertanggung jawab untuk menjaga keamanan kredensial akun Anda dan atas keakuratan
        informasi yang Anda berikan kepada kami (nama wisatawan, detail kontak, informasi penjemputan)
        -- kami mengandalkannya untuk benar-benar menjalankan perjalanan Anda.
      </p>

      <h2 className={h2}>Sales Agent</h2>
      <p className={p}>
        Jika Anda adalah Sales Agent, ketentuan komisi, jadwal pembayaran, dan penggunaan kode
        referral Anda diatur oleh perjanjian terpisah yang Anda setujui saat aplikasi Anda disetujui,
        bukan oleh ketentuan umum ini.
      </p>

      <h2 className={h2}>Tanggung jawab kami</h2>
      <p className={p}>
        Kami mengatur dan mengoordinasikan perjalanan yang tercantum di situs ini. Kami tidak
        bertanggung jawab atas keadaan di luar kendali kami yang memengaruhi perjalanan setelah
        berlangsung (cuaca, penutupan taman, keadaan force majeure) -- jika hal ini memengaruhi
        perjalanan Anda, kami akan bekerja sama dengan Anda untuk penjadwalan ulang atau solusi lain
        seperti yang dijelaskan di atas.
      </p>

      <h2 className={h2}>Hukum yang berlaku</h2>
      <p className={p}>Ketentuan ini diatur oleh hukum Indonesia.</p>

      <h2 className={h2}>Perubahan pada ketentuan ini</h2>
      <p className={p}>
        Jika kami membuat perubahan signifikan pada ketentuan ini, kami akan memperbarui tanggal di
        bagian atas halaman ini.
      </p>

      <h2 className={h2}>Hubungi kami</h2>
      <p className={p}>
        Ada pertanyaan tentang ketentuan ini? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </>
  );
}
