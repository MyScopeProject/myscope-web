import Image from "next/image"
import Link from "next/link"
import { Instagram, Mail, Youtube } from "lucide-react"

const COL_PRODUCT = [
  { label: "Events", href: "/events" },
  { label: "Movies", href: "/movies" },
  { label: "Become an organizer", href: "/become-organizer" },
]

const COL_COMPANY = [
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Blog", href: "/blog" },
]

const COL_SUPPORT = [
  { label: "Help center", href: "/help" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
]

const SOCIAL = [
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  { icon: Mail, href: "mailto:hello@myscope.com", label: "Email" },
]

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/Images/logo.png"
                alt="MyScope"
                width={160}
                height={56}
                className="h-14 w-auto"
              />
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Sri Lanka&rsquo;s home for live events, movies, and experiences. Discover, book, and show up.
            </p>
            <div className="mt-4 flex gap-1.5">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Product" items={COL_PRODUCT} />
          <FooterCol title="Company" items={COL_COMPANY} />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4">
          <FooterCol title="Support" items={COL_SUPPORT} />
          <div className="col-span-2 col-start-3 flex flex-col items-start justify-end gap-1 text-xs text-muted-foreground sm:items-end">
            <span>&copy; {year} MyScope. All rights reserved.</span>
            <span>Made in Colombo &middot; Built for live experiences.</span>
          </div>
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
