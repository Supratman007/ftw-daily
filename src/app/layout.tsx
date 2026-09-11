import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { TopProgressBar } from "@/components/TopProgressBar";
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
      {/* Not "flex flex-col" -- every page's <main> uses the standard
          "mx-auto max-w-*" centering pattern, and a flex item with auto
          margins on both sides doesn't get the default stretch-to-fill
          alignment: instead it sizes itself by its own content, capped
          only by its max-width. In practice that meant <main> rendered
          at close to its max-width (e.g. 896px) on every phone
          regardless of the real viewport -- the actual cause of the
          product page (and effectively every page) staying "wide" and
          non-responsive on narrow phones no matter what was fixed
          inside the page itself. Nothing here relies on body's own
          flexbox (no sticky-footer mt-auto, no shared vertical
          centering across pages -- the handful of pages that do center
          vertically set up "min-h-screen flex flex-col" on their own
          <main>, independent of this). */}
      <body className="min-h-full">
        {/* Suspense: useSearchParams (inside TopProgressBar) requires
            it -- without this, a page that's otherwise eligible for
            static rendering would get de-opted into fully dynamic
            rendering just to know the current query string.
            (Every page here already renders dynamically for other
            reasons -- SiteHeader's per-request auth check -- but this
            is the correct, forward-compatible way to use the hook
            regardless.) */}
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
