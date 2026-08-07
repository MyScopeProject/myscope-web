import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  BarChart3,
  QrCode,
  TicketCheck,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { type EventCardData } from "@/components/events/event-card"
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel"
import { UpcomingEventsSection } from "@/components/home/upcoming-events-section"
import { PastEventsMarquee, type PastEventItem } from "@/components/home/past-events-marquee"
import { PartnersMarquee, type PartnerItem } from "@/components/home/partners-marquee"
import { RevealOnScroll } from "@/components/site/reveal-on-scroll"
import { HeroSearchForm } from "@/components/home/hero-search-form"

// ISR — pre-render the homepage and refresh at most once per 60s. After the
// window, the next visitor serves the cached HTML while Vercel triggers a
// background refresh; if that refresh fails, stale content keeps being served.
// Together with on-demand revalidatePath('/') from the admin/publish flow,
// this gives near-instant freshness for important changes and near-zero API
// load for everything else. The homepage previously fired 4 client-side
// fetches per visitor against the Render API in Oregon — that's the latency
// this conversion eliminates.
export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Each section fetches independently and soft-fails to a safe empty value so
// one slow/broken endpoint never blanks out the whole page. Matches the
// soft-fail behaviour of the previous client-side fetches.
async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } })
    if (!res.ok) return fallback
    const data = await res.json()
    if (!data?.success) return fallback
    return (data.data ?? fallback) as T
  } catch {
    return fallback
  }
}

async function getHomepageData() {
  const [eventsRes, heroRes, pastRes, partnersRes] = await Promise.all([
    fetchJson<{ events: EventCardData[] }>("/api/events?upcoming=true&limit=8", { events: [] }),
    fetchJson<{ slides: HeroSlide[] }>("/api/hero-slides", { slides: [] }),
    fetchJson<{ items: PastEventItem[] }>("/api/past-events", { items: [] }),
    fetchJson<{ items: PartnerItem[] }>("/api/partners", { items: [] }),
  ])
  return {
    events: eventsRes.events ?? [],
    heroSlides: heroRes.slides ?? [],
    pastEvents: pastRes.items ?? [],
    partners: partnersRes.items ?? [],
  }
}

export default async function HomePage() {
  const { events, heroSlides, pastEvents, partners } = await getHomepageData()
  const showCarousel = heroSlides.length > 0

  return (
    <div>
      {/* Hero — carousel when admins have published slides, otherwise the default hero */}
      {showCarousel ? <HeroCarousel slides={heroSlides} /> : <DefaultHero />}

      {/* Featured events — category pills filter this section in place,
          client-side (see UpcomingEventsSection), instead of navigating
          away to /events. */}
      <section id="shop" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <RevealOnScroll>
          <Suspense fallback={null}>
            <UpcomingEventsSection initialEvents={events} />
          </Suspense>
        </RevealOnScroll>
      </section>

      {/* Past events — auto-scrolling photo strip (admin-curated). Hidden when empty. */}
      {pastEvents.length > 0 && (
        <section className="py-12">
          <RevealOnScroll>
          <div className="mx-auto mb-6 max-w-7xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Past events</h2>
            <p className="text-sm text-muted-foreground">
              A look back at shows that lit up the stage.
            </p>
          </div>
          <PastEventsMarquee items={pastEvents} />
          </RevealOnScroll>
        </section>
      )}

      {/* Organizer CTA */}
      <section>
        <RevealOnScroll>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
          {/* Light mode: brand violet block, same as the hero/footer/
              announcement bar (oklch(0.37 0.17 302)). Dark mode: transparent
              translucent card (matches the "Manage your event" card below) so
              the page-wide aurora shows through instead of a flat block. */}
          <div className="overflow-hidden rounded-2xl border border-transparent bg-[oklch(0.37_0.17_302)] dark:border-border dark:bg-card/60 dark:backdrop-blur-sm p-5 sm:p-12">
            <div className="grid items-center gap-6 sm:gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white dark:text-foreground sm:text-4xl">
                  Sell out your next show.
                </h2>
                <p className="mt-2 text-sm text-white/80 dark:text-muted-foreground sm:mt-3 sm:text-base">
                  Publish your event, take secure payments, scan tickets at the door,
                  and request payouts anytime — all from one dashboard built for Sri Lankan organizers.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="w-full bg-white text-[oklch(0.37_0.17_302)] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/80 sm:w-auto"
                  >
                    <Link href="/become-organizer">
                      Start hosting
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="w-full text-white hover:bg-white/10 hover:text-white dark:text-foreground dark:hover:bg-muted dark:hover:text-foreground sm:w-auto"
                  >
                    <a href="https://organizer.myscope.lk" target="_blank" rel="noopener noreferrer">Organizer dashboard</a>
                  </Button>
                </div>
              </div>

              <ul className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { icon: TicketCheck, title: "Multi-tier tickets", desc: "Early bird, VIP, regular." },
                  { icon: QrCode, title: "QR check-in", desc: "Scan tickets at the door." },
                  { icon: BarChart3, title: "Live analytics", desc: "Sales and attendance, real-time." },
                  { icon: Wallet, title: "Secure Payouts", desc: "Get secure payouts." },
                ].map(({ icon: Icon, title, desc }) => (
                  <li
                    key={title}
                    className="rounded-xl border border-white/15 bg-white/10 p-3 dark:border-border dark:bg-card/40 sm:p-4"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-white dark:bg-primary/10 dark:text-primary sm:h-8 sm:w-8">
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <h3 className="mt-2 text-xs font-semibold text-white dark:text-foreground sm:mt-2.5 sm:text-sm">{title}</h3>
                    <p className="mt-0.5 text-[11px] text-white/70 dark:text-muted-foreground sm:text-xs">{desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        </RevealOnScroll>
      </section>

      {/* Our Partners — admin-curated logo strip. Hidden when empty so the
          home page stays clean before any partners are added. */}
      {partners.length > 0 && (
        <section className="py-16 sm:py-20">
          <RevealOnScroll>
          <div className="mx-auto mb-8 max-w-7xl px-4 text-center sm:mb-10 sm:px-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground sm:text-base">
              Our Partners
            </h2>
          </div>
          <PartnersMarquee items={partners} />
          </RevealOnScroll>
        </section>
      )}

      {/* MyScope Organizer app promo — deliberately simple (no nested cards
          inside this one, per feedback): just a heading, description, and the
          real App Store badge asset. iOS link only for now. Sits as the last
          section before the global footer. */}
      <section>
        <RevealOnScroll>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Light mode: same brand violet block as the hero/footer/announcement
              bar (oklch(0.37 0.17 302)), so this card reads as an identity
              moment rather than a plain content card. Dark mode keeps the
              existing translucent card treatment. */}
          <div className="rounded-2xl border border-transparent bg-[oklch(0.37_0.17_302)] dark:border-border dark:bg-card/60 dark:backdrop-blur-sm p-5 sm:p-10">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-xl font-bold tracking-tight text-white dark:text-foreground sm:text-3xl">
                Manage your event with MyScope Client
              </h2>
              <p className="mt-2 text-sm text-white/80 dark:text-muted-foreground sm:mt-3 sm:text-base">
                Manage events, monitor ticket sales, track bookings, handle check-ins, and
                access real-time event insights — all from one powerful platform designed
                to simplify event management.
              </p>
              <div className="mt-5 flex justify-center sm:mt-6">
                <a
                  href="https://apps.apple.com/lk/app/myscope-client/id6771127791"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download MyScope Client on the App Store"
                >
                  <Image
                    src="/Images/app-store.png"
                    alt="Download on the App Store"
                    width={180}
                    height={63}
                    className="h-12 w-auto sm:h-14"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
        </RevealOnScroll>
      </section>
    </div>
  )
}

// Compact violet band hero. In light mode uses `oklch(0.37 0.17 302)` — the
// same violet as the SiteFooter and AnnouncementBar — so the page is
// bracketed top-to-bottom by one identity colour. In dark mode it goes
// transparent so the page-wide LightBeamsBackground aurora shows through;
// otherwise the hero would sit as a flat black rectangle while the rest of
// the page glows with the violet beam sweep. No `isolate` (no halos to
// contain anymore) so the fixed-position beams aren't clipped by a new
// stacking context.
function DefaultHero() {
  return (
    <section className="relative overflow-hidden bg-[oklch(0.37_0.17_302)] text-white dark:bg-transparent dark:text-foreground">
      <div className="relative mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-16 lg:py-20">
        <h1 className="text-balance text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
          Every show worth showing up for,{" "}
          {/* Gradient accent phrase — lighter fuchsia → white so it reads
              cleanly on the violet band (the original primary→fuchsia
              gradient was tuned for white backgrounds). */}
          <span className="bg-linear-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
            one tap away.
          </span>
        </h1>

        <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-white/80 sm:mt-4 sm:text-base">
          Entertain in a perfect scope — concerts, theatre, sports, and more.
        </p>

        {/* Search — white pill against the violet band so it pops as the
            single call-to-action. Button stays primary purple to match the
            rest of the site's CTA language. Extracted into a client island
            so the rest of the hero stays in the Server Component. */}
        <HeroSearchForm />
      </div>
    </section>
  )
}
