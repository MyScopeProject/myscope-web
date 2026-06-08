"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Calendar,
  QrCode,
  Search,
  TicketCheck,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EventCard, type EventCardData } from "@/components/events/event-card"
import { EventCardSkeleton } from "@/components/events/event-card-skeleton"
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel"
import { PastEventsMarquee, type PastEventItem } from "@/components/home/past-events-marquee"
import { PartnersMarquee, type PartnerItem } from "@/components/home/partners-marquee"
import { RevealOnScroll } from "@/components/site/reveal-on-scroll"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function HomePage() {
  const router = useRouter()
  const [events, setEvents] = React.useState<EventCardData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState("")
  const [heroSlides, setHeroSlides] = React.useState<HeroSlide[]>([])
  const [heroLoading, setHeroLoading] = React.useState(true)
  const [pastEvents, setPastEvents] = React.useState<PastEventItem[]>([])
  const [partners, setPartners] = React.useState<PartnerItem[]>([])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/events?upcoming=true&limit=8`)
        const data = await res.json()
        if (!cancelled && data?.success) {
          setEvents(data.data.events || [])
        }
      } catch {
        // Soft-fail — featured strip just stays empty
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Hero carousel — admin-managed slides from /api/hero-slides. Fetched
  // separately so the page renders its default hero immediately when no
  // slides have been published.
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/hero-slides`)
        const data = await res.json()
        if (!cancelled && data?.success) {
          setHeroSlides(data.data.slides || [])
        }
      } catch {
        // Soft-fail — default hero renders instead
      } finally {
        if (!cancelled) setHeroLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Past events — admin-curated photo strip. Soft-fails to nothing (the
  // section just doesn't render when empty).
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/past-events`)
        const data = await res.json()
        if (!cancelled && data?.success) {
          setPastEvents(data.data.items || [])
        }
      } catch {
        // Soft-fail — section stays hidden
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Partners — admin-curated logo strip shown above the footer. Same
  // soft-fail behaviour as past events.
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/partners`)
        const data = await res.json()
        if (!cancelled && data?.success) {
          setPartners(data.data.items || [])
        }
      } catch {
        // Soft-fail — section stays hidden
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/events?search=${encodeURIComponent(q)}` : "/events")
  }

  const showCarousel = !heroLoading && heroSlides.length > 0

  return (
    <div>
      {/* Hero — carousel when admins have published slides, otherwise the default hero */}
      {showCarousel ? (
        <HeroCarousel slides={heroSlides} />
      ) : (
      // Compact violet band hero. In light mode uses `oklch(0.37 0.17 302)`
      // — the same violet as the SiteFooter and AnnouncementBar — so the
      // page is bracketed top-to-bottom by one identity colour. In dark
      // mode it goes transparent so the page-wide LightBeamsBackground
      // aurora shows through; otherwise the hero would sit as a flat black
      // rectangle while the rest of the page glows with the violet beam
      // sweep. No `isolate` (no halos to contain anymore) so the
      // fixed-position beams aren't clipped by a new stacking context.
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
              rest of the site's CTA language. */}
          <form onSubmit={handleSearch} className="mt-6 w-full max-w-xl sm:mt-8">
            <div className="group flex items-center gap-2 rounded-full bg-white p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)] ring-1 ring-white/40 focus-within:ring-2 focus-within:ring-fuchsia-400/60">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search artists, venues, events…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 w-full rounded-full bg-transparent pl-11 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 shrink-0 rounded-full px-6 shadow-md">
                Search
              </Button>
            </div>
          </form>
        </div>
      </section>
      )}

      {/* Featured events */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <RevealOnScroll>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Upcoming events</h2>
            <p className="text-sm text-muted-foreground">
              Handpicked happenings across Sri Lanka this month.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/events">
              View all
              <ArrowRight />
            </Link>
          </Button>
        </div>

        {loading ? (
          // Skeletons mirror the EventCard shape exactly so the grid doesn't
          // reflow when real data swaps in.
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyEvents />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {events.slice(0, 8).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
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
          {/* Flat card — no gradient, just border + bg-card. Tighter padding
              + smaller type on phones so it doesn't dominate the scroll. */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-12">
            <div className="grid items-center gap-6 sm:gap-8 md:grid-cols-2">
              <div>
                <Badge>For organizers</Badge>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Sell out your next show.
                </h2>
                <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
                  Publish your event, take secure payments, scan tickets at the door,
                  and request payouts anytime — all from one dashboard built for Sri Lankan organizers.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:gap-3">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/become-organizer">
                      Start hosting
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
                    <Link href="/organizer">Organizer dashboard</Link>
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
                    className="rounded-xl border border-border bg-background/60 p-3 sm:p-4"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary sm:h-8 sm:w-8">
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <h3 className="mt-2 text-xs font-semibold text-foreground sm:mt-2.5 sm:text-sm">{title}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        </RevealOnScroll>
      </section>

      {/* Our Partners — admin-curated logo strip. Hidden when empty so the
          home page stays clean before any partners are added. Sits as the
          last section before the global footer. */}
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
    </div>
  )
}

function EmptyEvents() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Calendar className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">No upcoming events right now</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Check back soon — organizers are adding new shows every day.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/events">Browse all events</Link>
      </Button>
    </div>
  )
}

