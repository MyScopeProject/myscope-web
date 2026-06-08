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

// Per-platform brand colour for the social pill icons. White-on-violet was
// the previous treatment; this surfaces the platform identity instead so
// the icons read instantly without the user reading the tooltip.
const SOCIAL: Array<{
  icon: typeof Instagram
  href: string
  label: string
  iconClass: string
}> = [
  { icon: Instagram, href: "https://www.instagram.com/myscope.lk/", label: "Instagram", iconClass: "text-[#E4405F]" },
  { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61583531460821", label: "Facebook", iconClass: "text-[#1877F2]" },
  { icon: Mail, href: "mailto:hello.myscope@gmail.com", label: "Email", iconClass: "text-[oklch(0.37_0.17_302)]" },
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
    <footer className="mt-12 bg-[oklch(0.37_0.17_302)] text-white sm:mt-16">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pb-10 sm:pt-16">
        {/* Mobile grid uses 2 columns so the link sections sit side-by-side
            instead of stacking — halves the vertical height. Brand block
            and Contact column span the full 2 cols. On md+ everything
            flattens into the original 12-col layout. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-12 md:gap-x-10 md:gap-y-10">
          {/* Brand block — full width on mobile (col-span-2). Uses
              `footer_logo.png`, the dark-background variant of the brand
              mark (white hexagon, violet "v", white "SCOPE" wordmark) so
              it sits cleanly on the violet footer band without any filter
              tricks or a white pill wrapper. */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/Images/footer_logo.png"
                alt="MyScope"
                width={640}
                height={192}
                // The PNG has transparent padding baked in around the
                // visible mark, which leaves a big empty band above and
                // below the logo. Negative vertical margins pull the
                // surrounding content (tagline / nothing-above) back in
                // toward the actual ink so the brand block stays compact
                // without re-exporting the asset.
                className="-my-4 h-20 w-auto sm:-my-10 sm:h-40"
              />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75 sm:mt-5">
              MyScope is Sri Lanka&rsquo;s home for live events — concerts, theatre, sports, and everything in between. Discover, book, and show up with QR-coded tickets, real-time seat maps, and instant gate check-in.
            </p>
            <div className="mt-4 flex gap-3 sm:mt-7">
              {SOCIAL.map(({ icon: Icon, href, label, iconClass }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-110 sm:h-11 sm:w-11"
                >
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconClass}`} strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns — sit side-by-side on mobile (col-span-1 each)
              so the Support column's 8 links don't push the footer way
              down on phones. */}
          <div className="col-span-1 md:col-span-2">
            <FooterCol title="Explore" items={COL_PRODUCT} />
          </div>
          <div className="col-span-1 md:col-span-2">
            <FooterCol title="Support" items={COL_SUPPORT} />
          </div>

          {/* Contact column — full width on mobile (col-span-2) so the
              email + phone rows don't wrap awkwardly inside a narrow column. */}
          <div className="col-span-2 md:col-span-4">
            <FooterColHeading>Contact</FooterColHeading>
            <ul className="mt-3 space-y-3 text-sm sm:mt-5 sm:space-y-4">
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
        <div className="mt-8 border-t border-white/15 pt-4 text-xs text-white/65 sm:mt-14 sm:pt-6">
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
      <ul className="mt-3 space-y-2 text-sm sm:mt-5 sm:space-y-3">
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
  // White chip with a brand-violet icon — matches the social pills' new
  // treatment (white pill + coloured icon) so the brand block reads as a
  // single visual family.
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[oklch(0.37_0.17_302)] shadow-sm">
      {children}
    </span>
  )
}
