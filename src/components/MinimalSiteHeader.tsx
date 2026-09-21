import Link from "next/link";
import Image from "next/image";

/**
 * A logo-only header, linking back to the public homepage -- used on
 * staff/agent sign-in pages (src/app/admin/login, src/app/agent/login),
 * which sit outside the customer locale system entirely and have no
 * browse/account links that make sense on a staff-only gate. Without
 * this, someone who landed here by mistake (or decided not to sign in
 * after all) had no way back to the site short of the browser's back
 * button -- every customer-facing page has at least this much via
 * SiteHeader; this is the same "always a way back" fix, sized for a
 * page with no nav of its own to show.
 */
export function MinimalSiteHeader() {
  return (
    <header className="border-b border-sand-deep bg-white px-6 py-4">
      <Link href="/" className="inline-flex items-center">
        <Image src="/logo.jpg" alt="Adventure Lombok Booking" width={120} height={36} className="h-8 w-auto" />
      </Link>
    </header>
  );
}
