import Image from "next/image"
import Link from "next/link"
import { Facebook, Instagram, Mail } from "lucide-react"

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
]

const SOCIAL = [
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Mail, href: "mailto:hello.myscope@gmail.com", label: "Email" },
]

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        {/* Brand block on top, two link columns below.
            Cleaner than 5-col + brand: less density, more whitespace. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/Images/logo.png"
                alt="MyScope"
                width={160}
                height={56}
                className="h-12 w-auto sm:h-14"
              />
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Sri Lanka&rsquo;s home for live events, concerts, theatre, and sports. Discover, book, and show up.
            </p>
            <div className="mt-4 flex gap-2">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Explore" items={COL_PRODUCT} />
          <FooterCol title="Support" items={COL_SUPPORT} />
        </div>

        {/* Bottom bar — single line, centered on phones */}
        <div className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground sm:mt-10 sm:pt-6 sm:text-left">
          &copy; {year} MyScope. All rights reserved.
        </div>
      </div>
    </footer>
  )
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
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-foreground/80 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
