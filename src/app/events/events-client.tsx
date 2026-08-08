"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventCard, type EventCardData } from "@/components/events/event-card"
import { EventCardSkeleton } from "@/components/events/event-card-skeleton"
import { NAV_ITEMS } from "@/components/site/nav-items"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type DateFilter = "all" | "today" | "week" | "month"

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
]

// Same category list the top nav uses (minus Shop, which isn't an event
// category) — an "All" pill up front covers the unfiltered case the nav
// itself has no entry point for. Lets a visitor switch categories without
// leaving this page, instead of navbar → page load → navbar → page load.
const CATEGORY_PILLS = [
  { label: "All", category: "" },
  ...NAV_ITEMS.filter((item) => item.category !== "__shop").map((item) => ({
    label: item.label,
    category: item.category,
  })),
]

interface EventRow extends EventCardData {
  description?: string
}

// Suspense wrapper — useSearchParams() bails Next 16 prerender otherwise.
export default function EventsPageClient() {
  return (
    <React.Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
      <EventsPageInner />
    </React.Suspense>
  )
}

function EventsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Seed filters from the URL so deep links from the landing page work.
  const [search, setSearch] = React.useState(() => searchParams?.get("search") ?? "")
  const [category, setCategory] = React.useState(() => searchParams?.get("category") ?? "")
  const [dateFilter, setDateFilter] = React.useState<DateFilter>(
    () => (searchParams?.get("when") as DateFilter) ?? "all",
  )

  // Deep-link-only params from the navbar search's date-range + price-range
  // pickers — no UI on this page duplicates them, they just ride along in
  // the fetch and stay in the URL so the link stays shareable.
  const [from, setFrom] = React.useState(() => searchParams?.get("from") ?? "")
  const [to, setTo] = React.useState(() => searchParams?.get("to") ?? "")
  const [minPrice, setMinPrice] = React.useState(() => searchParams?.get("minPrice") ?? "")
  const [maxPrice, setMaxPrice] = React.useState(() => searchParams?.get("maxPrice") ?? "")

  // Keep category in sync when navigating via navbar links (same page, new query params).
  React.useEffect(() => {
    setCategory(searchParams?.get("category") ?? "")
  }, [searchParams])

  // Debounce search input — fetch fires 350ms after typing stops.
  const [debouncedSearch, setDebouncedSearch] = React.useState(search)
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const [events, setEvents] = React.useState<EventRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Sync filter state back into the URL (replace, not push — no history spam).
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
    if (category) params.set("category", category)
    if (dateFilter !== "all") params.set("when", dateFilter)
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (minPrice) params.set("minPrice", minPrice)
    if (maxPrice) params.set("maxPrice", maxPrice)
    const qs = params.toString()
    router.replace(qs ? `/events?${qs}` : "/events", { scroll: false })
  }, [debouncedSearch, category, dateFilter, from, to, minPrice, maxPrice, router])

  // Fetch when search/category change. Date filter is applied client-side;
  // from/to/minPrice/maxPrice (set by the navbar search) are forwarded
  // straight through to the API, which filters them server-side.
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams()
        params.set("upcoming", "true")
        if (category) params.set("category", category)
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
        if (from) params.set("from", from)
        if (to) params.set("to", to)
        if (minPrice) params.set("minPrice", minPrice)
        if (maxPrice) params.set("maxPrice", maxPrice)

        const res = await fetch(`${API_URL}/api/events?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return
        if (data?.success) {
          setEvents(data.data.events || [])
        } else {
          setError(data?.message || "Failed to load events.")
        }
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Please try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, category, from, to, minPrice, maxPrice])

  // Client-side date window filter.
  const filtered = React.useMemo(() => {
    if (dateFilter === "all") return events
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let end = new Date(start)
    if (dateFilter === "today") {
      end = new Date(start)
      end.setDate(end.getDate() + 1)
    } else if (dateFilter === "week") {
      end.setDate(end.getDate() + 7)
    } else {
      end.setMonth(end.getMonth() + 1)
    }
    return events.filter((e) => {
      const when = e.start_time || e.date
      if (!when) return false
      const d = new Date(when)
      return d >= start && d <= end
    })
  }, [events, dateFilter])

  const clearAll = () => {
    setSearch("")
    setCategory("")
    setDateFilter("all")
    setFrom("")
    setTo("")
    setMinPrice("")
    setMaxPrice("")
  }

  const hasActiveFilters = !!(
    search ||
    category ||
    dateFilter !== "all" ||
    from ||
    to ||
    minPrice ||
    maxPrice
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header — tighter and quieter than before */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Events
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Concerts, theatre, sports, and more.
        </p>
      </div>

      {/* Category pills — horizontally scrollable on mobile so switching
          categories is a single tap on this page, no navbar round-trip. The
          -mx-4/px-4 pair lets the scroll area bleed to the screen edge on
          phones while staying within the max-w-7xl container everywhere else. */}
      <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
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

      {/* Filters — search + date dropdown. Surfaces use a translucent
          card tone + backdrop blur so the global light beams flow through
          the row instead of being sliced off by a solid dark band. Border
          style is unchanged so the inputs still read as discrete controls. */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search events, artists, venues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-card/30 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-md transition-colors focus:border-primary/50 focus:bg-card/50 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <select
            aria-label="Date range"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="h-11 w-full appearance-none rounded-xl border border-border bg-card/30 pl-10 pr-9 text-sm font-medium text-foreground backdrop-blur-md transition-colors focus:border-primary/50 focus:bg-card/50 focus:outline-none sm:w-44"
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Result count + clear — single quiet line above results */}
      <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground sm:text-sm">
        <span>
          {loading
            ? "Loading…"
            : `${filtered.length} ${filtered.length === 1 ? "event" : "events"}`}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setSearch((s) => s)} />
      ) : filtered.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClear={clearAll} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}


function LoadingGrid() {
  // Skeletons mirror the EventCard shape exactly so the grid doesn't reflow
  // when results swap in.
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Empty state — intentionally minimal. Just the heading on a clean panel.
// No icon, no subtitle, no clear-filters CTA (a "Clear all" affordance
// already lives in the result-count row above this card).
function EmptyState({
  hasFilters,
}: {
  hasFilters: boolean
  onClear: () => void
}) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-16 text-center">
      <h3 className="text-base font-semibold text-foreground">
        {hasFilters ? "No events match your filters" : "No upcoming events"}
      </h3>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">Couldn&rsquo;t load events</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
