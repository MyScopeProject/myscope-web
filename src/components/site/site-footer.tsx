import Link from "next/link"
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react"
import { FooterLogo } from "@/components/site/footer-logo"

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

// Per-platform brand colour for the social pill icons — surfaces the platform
// identity so the icons read instantly. The pill itself is a neutral token
// chip (see below) that adapts to light + dark.
const SOCIAL: Array<{
  icon: typeof Instagram
  href: string
  label: string
  iconClass: string
}> = [
  { icon: Instagram, href: "https://www.instagram.com/myscope.lk/", label: "Instagram", iconClass: "text-[#E4405F]" },
  { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61583531460821", label: "Facebook", iconClass: "text-[#1877F2]" },
  { icon: Mail, href: "mailto:hello.myscope@gmail.com", label: "Email", iconClass: "text-primary" },
]

const CONTACT_PHONE = "+94 76 467 0645"
const CONTACT_EMAIL = "hello@myscope.lk"
const CONTACT_LOCATION = "Colombo, Sri Lanka"

// MyScope footer — fully theme-token driven. Both modes share the same
// structure: a subtle muted band lifted off the page with a top border and
// foreground text. In dark mode `--muted` sits a step lighter than the page
// background, so the band reads the same way it does in light. No fixed violet
// band anymore — the footer sits inside the theme in both modes.
export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-12 border-t border-border bg-muted/40 text-foreground sm:mt-16">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pb-10 sm:pt-16">
        {/* Mobile grid uses 2 columns so the link sections sit side-by-side
            instead of stacking — halves the vertical height. Brand block
            and Contact column span the full 2 cols. On md+ everything
            flattens into the original 12-col layout. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-12 md:gap-x-10 md:gap-y-10">
          {/* Brand block — full width on mobile (col-span-2). Same
              theme-aware logo swap as the header (see footer-logo.tsx) for
              one consistent brand mark top-to-bottom that reads correctly
              on both the light and dark muted footer bands. */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="inline-flex items-center">
              <FooterLogo className="h-20 w-auto sm:h-24" />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground sm:mt-5">
              MyScope is Sri Lanka&rsquo;s Smartest Ticket Booking Platform — concerts, theatre, sports, and everything in between. Discover, book, and show up with QR coded tickets, real time seat maps, and instant gate check in.
            </p>
            <div className="mt-4 flex gap-3 sm:mt-7">
              {SOCIAL.map(({ icon: Icon, href, label, iconClass }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-transform hover:scale-110 sm:h-11 sm:w-11"
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
                  className="group inline-flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
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
                  className="group inline-flex items-center gap-3 break-all text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ContactIcon>
                    <Mail className="h-4 w-4" strokeWidth={2.25} />
                  </ContactIcon>
                  <span>{CONTACT_EMAIL}</span>
                </a>
              </li>
              <li className="inline-flex items-center gap-3 text-muted-foreground">
                <ContactIcon>
                  <MapPin className="h-4 w-4" strokeWidth={2.25} />
                </ContactIcon>
                <span>{CONTACT_LOCATION}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom strip — single-line copyright. */}
        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground sm:mt-14 sm:pt-6">
          &copy; Copyright {year}  &nbsp; MyScope (PVT) LTD &nbsp;|&nbsp; All Rights Reserved
        </div>
      </div>
    </footer>
  )
}

function FooterColHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold text-foreground">{children}</h3>
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
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
  // Canonical accent chip — brand-violet icon on a violet-tint disc. Adapts to
  // light + dark via tokens (matches avatars, badges, active nav chips).
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      {children}
    </span>
  )
}
