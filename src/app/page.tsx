"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Calendar,
  MapPin,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EventCard, type EventCardData } from "@/components/events/event-card"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const STATS = [
  { label: "Events listed", value: "1,200+" },
  { label: "Tickets booked", value: "85K+" },
  { label: "Cities covered", value: "12" },
  { label: "Organizers", value: "300+" },
]

export default function HomePage() {
  const router = useRouter()
  const [events, setEvents] = React.useState<EventCardData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState("")

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/events?search=${encodeURIComponent(q)}` : "/events")
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Decorative gradient backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60 dark:opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(60% 60% at 20% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), radial-gradient(60% 60% at 90% 20%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 60%)",
          }}
        />

        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 md:py-28">
          <Badge variant="default" className="mb-6">
            <Sparkles className="h-3 w-3" />
            New events every week
          </Badge>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Find the moments worth showing up for.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Concerts, theatre, comedy, festivals, conferences — discover and book tickets for the best live
            experiences across Sri Lanka.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search events, artists, venues…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-lg bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <Button type="submit" size="default">
              Search
              <ArrowRight />
            </Button>
          </form>

          {/* Stats */}
          <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {events.slice(0, 8).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Organizer CTA */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/10 via-card to-card p-8 sm:p-12">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <Badge>For organizers</Badge>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Sell out your next show.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Publish your event, take secure payments, scan tickets at the door, and get paid weekly —
                  all from one dashboard built for Sri Lankan organizers.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/become-organizer">
                      Start hosting
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/organizer">Organizer dashboard</Link>
                  </Button>
                </div>
              </div>

              <ul className="space-y-3 text-sm">
                {[
                  { icon: Calendar, text: "Multi-tier ticketing with sale windows" },
                  { icon: MapPin, text: "QR check-in for staff at the venue" },
                  { icon: Trophy, text: "Real-time analytics and payouts" },
                ].map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-foreground">{text}</span>
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
