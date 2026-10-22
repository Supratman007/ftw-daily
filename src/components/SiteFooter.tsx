import Link from "next/link";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_LINK, TIKTOK_URL, WHATSAPP_NUMBER } from "@/lib/contact";

const ICON_STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
      <path d="M14 21v-8h3l.5-3.5H14V7.2c0-1 .4-1.7 1.9-1.7H18V2.2C17.6 2.1 16.5 2 15.2 2 12.4 2 10.5 3.7 10.5 6.8v2.7H7.5V13h3v8z" />
    </svg>
  ),
  TikTok: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
      <path d="M14 3v10.5a3.5 3.5 0 11-3-3.46" />
      <path d="M14 3c.5 2.8 2.3 4.6 5 5" />
    </svg>
  ),
};

/**
 * Site-wide footer -- About Us, Contact Us, Privacy Policy and Terms
 * links, plus (once configured) a phone/WhatsApp number and social
 * icons. The phone number and social links only render if the
 * underlying value is actually set (see lib/contact.ts) -- nothing
 * fabricated, so a fresh deploy with no env vars set just shows the
 * four page links and nothing else.
 */
export function SiteFooter({ locale = DEFAULT_LOCALE }: { locale?: Locale } = {}) {
  const dict = getDictionary(locale).footer;
  const pathPrefix = locale === "id" ? "/id" : "";
  const socialLinks = [
    INSTAGRAM_URL && { href: INSTAGRAM_URL, label: "Instagram" },
    FACEBOOK_URL && { href: FACEBOOK_URL, label: "Facebook" },
    TIKTOK_URL && { href: TIKTOK_URL, label: "TikTok" },
  ].filter((s): s is { href: string; label: string } => Boolean(s));

  return (
    <footer className="mt-16 border-t border-sand-deep bg-white px-6 py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-xs text-ink-soft">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href={`${pathPrefix}/about`} className="hover:text-ink hover:underline">
            {dict.aboutUs}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={`${pathPrefix}/contact`} className="hover:text-ink hover:underline">
            {dict.contactUs}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={`${pathPrefix}/privacy`} className="hover:text-ink hover:underline">
            {dict.privacyPolicy}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={`${pathPrefix}/terms`} className="hover:text-ink hover:underline">
            {dict.termsOfService}
          </Link>
        </div>

        {WHATSAPP_NUMBER && (
          <a href={PHONE_LINK} className="hover:text-ink hover:underline">
            +{WHATSAPP_NUMBER}
          </a>
        )}

        {socialLinks.length > 0 && (
          <div className="flex items-center gap-4">
            {socialLinks.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-ink-soft hover:text-teal"
              >
                {SOCIAL_ICONS[s.label]}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
