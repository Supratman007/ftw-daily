import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Adventure Lombok Booking",
  description:
    "Book tours, activities, and more with Adventure Lombok Tour — secure online booking, real availability, local since 2006.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // proxy.ts stamps this on every request -- "id" for anything under
  // /id, "en" for everything else (including /admin, /agent). There's
  // no [lang] route segment this layout could read a param from
  // instead (see src/lib/i18n/locales.ts for why), so the request
  // header is the only way a shared root layout knows which side of
  // the split the current page is on.
  const headersList = await headers();
  const lang = headersList.get("x-locale") === "id" ? "id" : "en";

  return (
    <html
      lang={lang}
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
