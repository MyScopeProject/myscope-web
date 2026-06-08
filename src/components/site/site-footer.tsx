import Image from "next/image"
import Link from "next/link"
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react"

const COL_PRODUCT = [
  { label: "Concerts", href: "/events?category=Concerts" },
  { label: "Theatre", href: "/events?category=Theatre" },
  { label: "Sports", href: "/events?category=Sports" },
  { label: "Events", href: "/events?category=Events" },
  { label: "Become an organizer", href: "/become-organizer" },
]

const COL_SUPPORT = [
  { label: "About", href: "/about" },
  { label: "Help center", href: "/help" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Refunds", href: "/refund-policy" },
  { label: "Cancellations", href: "/cancellation-policy" },
  { label: "Cookies", href: "/cookies" },
]

const SOCIAL = [
  { icon: Instagram, href: "https://www.instagram.com/myscope.lk/", label: "Instagram" },
  { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61583531460821", label: "Facebook" },
  { icon: Mail, href: "mailto:hello.myscope@gmail.com", label: "Email" },
]

const CONTACT_PHONE = "+94 76 482 9645"
const CONTACT_EMAIL = "hello.myscope@gmail.com"
const CONTACT_LOCATION = "Colombo, Sri Lanka"

// MyScope footer palette — matches the announcement bar at the top of the
// page so the violet band bookends the site. Header + footer share the same
// `oklch(0.37 0.17 302)` so anyone scrolling top-to-bottom sees the same
// MyScope identity colour open and close the page. Stable across light + dark
// theme by design.
//
//   bg-[oklch(0.37_0.17_302)] — deep violet body (same token the
//                               AnnouncementBar uses).
//   bg-violet-700             — slightly-lighter violet for the social pills
//                               + contact-icon chips so they sit one tone
//                               above the body without disappearing into it.

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-16 bg-[oklch(0.37_0.17_302)] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pb-10 sm:pt-16">
        <div className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-12">
          {/* Brand block */}
          <div className="md:col-span-4">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/Images/navbar_logo.png"
                alt="MyScope"
                width={320}
                height={96}
                // Wordmark variant (same asset the navbar uses) — fuller and
                // more identifiable than the square "v" mark on the dark
                // band. brightness-0 invert flips the dark logo to pure
                // white so it sits cleanly on the violet band without
                // needing a separate light-on-dark asset.
                //
                // Sized generously (h-20 / sm:h-24) so the brand reads from
                // a distance. The Support column (8 links) sets the footer
                // height, so the brand column can grow without making the
                // footer taller.
                className="h-20 w-auto brightness-0 invert sm:h-24"
              />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/75">
              MyScope is Sri Lanka&rsquo;s home for live events — concerts, theatre, sports, and everything in between. Discover, book, and show up with QR-coded tickets, real-time seat maps, and instant gate check-in.
            </p>
            <div className="mt-7 flex gap-3">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-violet-700 text-white transition-transform hover:scale-110"
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="md:col-span-2">
            <FooterCol title="Explore" items={COL_PRODUCT} />
          </div>
          <div className="md:col-span-2">
            <FooterCol title="Support" items={COL_SUPPORT} />
          </div>

          {/* Contact column — fuchsia-tinted icons + text rows. Mirrors the
              reference design's pattern: accent-coloured icon + light text. */}
          <div className="md:col-span-4">
            <FooterColHeading>Contact</FooterColHeading>
            <ul className="mt-5 space-y-4 text-sm">
              <li>
                <a
                  href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}
                  className="group inline-flex items-center gap-3 text-white/90 transition-colors hover:text-white"
                >
                  <ContactIcon>
                    <Phone className="h-4 w-4" strokeWidth={2.25} />
                  </ContactIcon>
                  <span>{CONTACT_PHONE}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="group inline-flex items-center gap-3 break-all text-white/90 transition-colors hover:text-white"
                >
                  <ContactIcon>
                    <Mail className="h-4 w-4" strokeWidth={2.25} />
                  </ContactIcon>
                  <span>{CONTACT_EMAIL}</span>
                </a>
              </li>
              <li className="inline-flex items-center gap-3 text-white/90">
                <ContactIcon>
                  <MapPin className="h-4 w-4" strokeWidth={2.25} />
                </ContactIcon>
                <span>{CONTACT_LOCATION}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom strip — single-line copyright. Border uses /15 opacity so
            the divider reads on the violet band without being harsh. */}
        <div className="mt-14 border-t border-white/15 pt-6 text-xs text-white/65">
          &copy; Copyright {year} MyScope Private Limited &nbsp;|&nbsp; All Rights Reserved
        </div>
      </div>
    </footer>
  )
}

function FooterColHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold text-white">{children}</h3>
}

function FooterCol({
  title,
  items,
}: {
  title: string
  items: { label: string; href: string }[]
}) {
  return (
    <div>
      <FooterColHeading>{title}</FooterColHeading>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-white/80 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContactIcon({ children }: { children: React.ReactNode }) {
  // Dark-purple chip that sits above the violet footer band — same shade as
  // the social pills (violet-700) so the contact icons and the social icons
  // share a single visual language.
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white">
      {children}
    </span>
  )
}
