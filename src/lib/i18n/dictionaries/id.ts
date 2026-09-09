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
} satisfies Dictionary;
