"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { AnnouncementBar } from "@/components/site/announcement-bar"

/**
 * Wraps the consumer-site chrome (marketing ticker, main nav, footer) around
 * page content — except on organizer routes (the dashboard + its dedicated
 * login page), which bring their own chrome (OrganizerTopBar) since
 * organizer.myscope.lk has no reason to carry the consumer site's nav.
 *
 * "Is this an organizer route" needs TWO signals, checked client-side only
 * (deliberately — reading the real signal server-side via headers()/cookies()
 * in the root layout forces the ENTIRE app out of static rendering, which
 * killed the homepage's ISR when tried):
 *   1. Hostname starts with "organizer." — catches every request on the
 *      subdomain. proxy.ts rewrites these internally ("/" -> "/organizer"),
 *      but that rewrite is invisible to usePathname(), which keeps showing
 *      the ORIGINAL pre-rewrite path ("/", "/login") — confirmed empirically,
 *      contrary to what Next's docs on config-level rewrites would suggest
 *      (also tried and empirically didn't help either). So pathname alone
 *      cannot detect the subdomain case at all.
 *   2. pathname starts with "/organizer" — catches the dual-access case on
 *      the main host (myscope.lk/organizer/*, no rewrite involved, pathname
 *      is genuinely correct there).
 *
 * Because the hostname check only resolves after hydration, the very first
 * paint on the subdomain briefly shows consumer chrome before flipping —
 * consistent with the rest of the organizer section, which already has a
 * brief auth-loading flash on every page (useOrganizerGuard).
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isOrganizerHost, setIsOrganizerHost] = useState(false)

  useEffect(() => {
    setIsOrganizerHost(window.location.hostname.startsWith("organizer."))
  }, [])

  const isOrganizer = isOrganizerHost || (pathname?.startsWith("/organizer") ?? false)

  if (isOrganizer) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      <AnnouncementBar />
      {/* SiteHeader uses useSearchParams() — Next 16 requires a Suspense
          boundary around any component that reads search params, or static
          prerender of /404 fails. Fallback is just an empty 16-tall band so
          layout doesn't jump. */}
      <Suspense fallback={<div className="h-16" aria-hidden />}>
        <SiteHeader />
      </Suspense>
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <SiteFooter />
    </>
  )
}
