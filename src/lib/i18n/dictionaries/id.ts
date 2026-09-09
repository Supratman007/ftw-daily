import type { Dictionary } from "./en";

/** See en.ts for how this file is maintained -- every key here must
 * match en.ts exactly (`satisfies Dictionary` below enforces it). */
export const id = {
  common: {
    siteName: "Adventure Lombok Booking",
    redeemVoucher: "Tukarkan voucher hadiah",
    login: "Masuk",
    myAccount: "Akun saya",
    staffDashboard: "Dasbor staf",
    agentDashboard: "Dasbor agen",
    logout: "Keluar",
    becomeAgent: "Jadi Agen Penjualan",
  },
  home: {
    searchPlaceholder: "Cari trip, aktivitas, lokasi…",
    allTypes: "Semua jenis",
    allLocations: "Semua lokasi",
    searchButton: "Cari",
    clear: "Hapus filter",
    resultsFound: (count: number) => `${count} trip ditemukan`,
    noProductsYet: "Belum ada trip yang dipublikasikan — silakan cek lagi nanti.",
    noResults: "Tidak ada trip yang cocok dengan filter ini — coba hapus salah satu filter dan cari lagi.",
  },
  product: {
    perPerson: "/ orang",
    manualConfirmationNotice:
      "Trip ini memerlukan konfirmasi manual sebelum pemesanan -- ketersediaan tergantung kuota izin taman yang kami periksa secara manual. Beri tahu kami tanggal Anda dan kami akan menghubungi kembali, biasanya dalam satu atau dua hari. Belum ada biaya yang ditagih sampai kami konfirmasi.",
    dateLabel: "Tanggal",
    travelersLabel: "Jumlah wisatawan",
    hotelNameLabel: "Nama hotel (opsional)",
    hotelNamePlaceholder: "Di mana kami harus menjemput Anda?",
    roomNumberLabel: "Nomor kamar (opsional)",
    discountCodeLabel: "Kode diskon (opsional)",
    discountCodePlaceholder: "misalnya WELCOME10",
    continueToRequest: "Lanjutkan ke permintaan",
    continueToCheckout: "Lanjutkan ke pembayaran",
    giftThisTrip: "🎁 Hadiahkan trip ini",
    carHirePriceLabel: "Harga berdasarkan mobil, durasi & area penjemputan — pilih opsi Anda di bawah",
    transportPriceLabel: "Harga berdasarkan area penjemputan — pilih opsi Anda di bawah",
    reviewsHeading: "Ulasan",
    reviewCount: (count: number) => `${count} ulasan`,
  },
} satisfies Dictionary;
