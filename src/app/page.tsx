"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Drama,
  Music2,
  QrCode,
  Search,
  Ticket,
  TicketCheck,
  Trophy,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EventCard, type EventCardData } from "@/components/events/event-card"
import { HeroCarousel, type HeroEvent } from "@/components/home/hero-carousel"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Quick-access category chips beneath the hero search. Mirrors the navbar
// taxonomy so users see the same categories everywhere.
const HERO_CATEGORIES = [
  { label: "Concerts", href: "/events?category=Concerts", icon: Music2 },
  { label: "Theatre", href: "/events?category=Theatre", icon: Drama },
  { label: "Sports", href: "/events?category=Sports", icon: Trophy },
  { label: "Events", href: "/events?category=Events", icon: Ticket },
]

export default function HomePage() {
  const router = useRouter()
  const [events, setEvents] = React.useState<EventCardData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState("")
  const [heroEvents, setHeroEvents] = React.useState<HeroEvent[]>([])
  const [heroLoading, setHeroLoading] = React.useState(true)

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

  // Hero carousel — fetched separately so the page can render its default hero
  // immediately when no events are featured.
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/events/featured?limit=8`)
        const data = await res.json()
        if (!cancelled && data?.success) {
          setHeroEvents(data.data.events || [])
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/events?search=${encodeURIComponent(q)}` : "/events")
  }

  const showCarousel = !heroLoading && heroEvents.length > 0

  return (
    <div>
      {/* Hero — carousel when admins have featured events, otherwise the default hero */}
      {showCarousel ? (
        <HeroCarousel events={heroEvents} />
      ) : (
      <section className="relative isolate overflow-hidden border-b border-border">
        {/* Subtle backdrop — single soft gradient at the top fading into bg.
            Cleaner than two overlapping radials; reads better in both modes. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.07] via-background to-background"
        />
        {/* Faint grid pattern overlay — adds texture without colour noise */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 70%)",
          }}
        />

        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:py-24">
          {/* Eyebrow — animated live indicator anchors the local feel */}
          <div className="mb-5 flex justify-center sm:mb-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live across Sri Lanka
            </span>
          </div>

          {/* Headline — gradient accent on the second clause adds polish
              without going full marketing-page noise */}
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Every show worth showing up for,{" "}
            <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
              one tap away.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:mt-5 sm:text-base">
            Concerts, theatre, sports, festivals — discover and book live experiences across the island.
          </p>

          {/* Search — pill-shaped, search icon inline, submit attached */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-7 flex max-w-xl items-center gap-2 sm:mt-9"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search artists, venues, events…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-primary/50 focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 shrink-0 rounded-full px-5"
            >
              <span className="hidden sm:inline">Search</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick category chips — instant filtering by category */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-6">
            {HERO_CATEGORIES.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
            <Link
              href="/events"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Browse all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* Featured events */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
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
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-16/10 animate-pulse rounded-xl bg-muted"
              />
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
      </section>

      {/* Organizer CTA */}
      <section className="border-t border-border bg-card/40">
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
                  Publish your event, take secure payments, scan tickets at the door, and get paid weekly —
                  all from one dashboard built for Sri Lankan organizers.
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
                  { icon: Wallet, title: "Weekly payouts", desc: "Funds settle every Friday." },
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
      </section>
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
