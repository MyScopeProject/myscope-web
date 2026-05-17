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
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const CATEGORIES = [
  "Concerts",
  "Theatre",
  "Sports",
  "Events",
]

type DateFilter = "all" | "today" | "week" | "month"

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
]

interface EventRow extends EventCardData {
  description?: string
}

// Suspense wrapper — useSearchParams() bails Next 16 prerender otherwise.
export default function EventsPage() {
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
    const qs = params.toString()
    router.replace(qs ? `/events?${qs}` : "/events", { scroll: false })
  }, [debouncedSearch, category, dateFilter, router])

  // Fetch when search/category change. Date filter is applied client-side.
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
  }, [debouncedSearch, category])

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
  }

  const hasActiveFilters = !!(search || category || dateFilter !== "all")

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

      {/* Filters — one card-style row: search + date dropdown */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Slim search input — icon inside, clear button inside, one piece */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search events, artists, venues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/50 focus:outline-none"
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

        {/* Date dropdown — replaces 4 pills with a single compact select */}
        <div className="relative shrink-0">
          <select
            aria-label="Date range"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="h-11 w-full appearance-none rounded-xl border border-border bg-card pl-10 pr-9 text-sm font-medium text-foreground transition-colors focus:border-primary/50 focus:outline-none sm:w-44"
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

      {/* Category pills — horizontal scroll on phones, wrap on desktop */}
      <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        <FilterPill active={category === ""} onClick={() => setCategory("")}>
          All
        </FilterPill>
        {CATEGORIES.map((c) => (
          <FilterPill
            key={c}
            active={category === c}
            onClick={() => setCategory(category === c ? "" : c)}
          >
            {c}
          </FilterPill>
        ))}
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

function FilterPill({
  active,
  onClick,
  subtle = false,
  children,
}: {
  active: boolean
  onClick: () => void
  subtle?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-all duration-150",
        active
          ? subtle
            ? "bg-foreground text-background shadow-sm"
            : "bg-primary text-primary-foreground shadow-sm"
          : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
      )}
    >
      {children}
    </button>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="aspect-3/4 animate-pulse bg-muted" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-3 w-2/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean
  onClear: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Calendar className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        {hasFilters ? "No events match your filters" : "No upcoming events"}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try widening your search — fewer filters often surface more results."
          : "Check back soon — organizers are adding new shows every day."}
      </p>
      {hasFilters ? (
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to home</Link>
        </Button>
      )}
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
