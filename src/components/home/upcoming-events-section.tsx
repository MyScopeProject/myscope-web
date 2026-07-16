"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventCard, type EventCardData } from "@/components/events/event-card"
import { EventCardSkeleton } from "@/components/events/event-card-skeleton"
import { NAV_ITEMS } from "@/components/site/nav-items"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Same category list the top nav + /events page use — an "All" pill covers
// the unfiltered case. Tapping a pill re-fetches this section in place
// instead of sending the visitor to /events.
const CATEGORY_PILLS = [
  { label: "All", category: "" },
  ...NAV_ITEMS.filter((item) => item.category !== "__shop").map((item) => ({
    label: item.label,
    category: item.category,
  })),
]

interface Props {
  // Server-fetched "All" list, rendered immediately with zero client fetch —
  // only switching to a different pill triggers a client-side refetch.
  initialEvents: EventCardData[]
}

export function UpcomingEventsSection({ initialEvents }: Props) {
  const [category, setCategory] = React.useState("")
  const [events, setEvents] = React.useState(initialEvents)
  const [loading, setLoading] = React.useState(false)
  const isFirstRun = React.useRef(true)

  React.useEffect(() => {
    // The server already fetched the "All" list — skip the redundant
    // duplicate request on mount.
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ upcoming: "true", limit: "8" })
        if (category) params.set("category", category)
        const res = await fetch(`${API_URL}/api/events?${params.toString()}`)
        const data = await res.json()
        if (!cancelled && data?.success) setEvents(data.data.events || [])
      } catch {
        // Soft-fail — keep showing whatever was already there.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [category])

  return (
    <>
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

      {/* Category pills — horizontally scrollable on mobile, same pattern as
          /events. Filters this section in place, no navigation. */}
      <div className="mb-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {CATEGORY_PILLS.map((pill) => {
          const active = category === pill.category
          return (
            <button
              key={pill.label}
              type="button"
              onClick={() => setCategory(pill.category)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card/30 text-muted-foreground backdrop-blur-md hover:bg-muted hover:text-foreground",
              )}
            >
              {pill.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
    </>
  )
}

function EmptyEvents() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Calendar className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">No upcoming events right now</h3>
      <Button asChild variant="outline" size="sm">
        <Link href="/events">Browse all events</Link>
      </Button>
    </div>
  )
}
