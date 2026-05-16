"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Calendar,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EventCard, type EventCardData } from "@/components/events/event-card"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const CATEGORIES = [
  "Music",
  "Sports",
  "Theater",
  "Comedy",
  "Conference",
  "Festival",
  "Other",
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

export default function EventsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Seed filters from the URL so deep links from the landing page work.
  const [search, setSearch] = React.useState(() => searchParams?.get("search") ?? "")
  const [category, setCategory] = React.useState(() => searchParams?.get("category") ?? "")
  const [dateFilter, setDateFilter] = React.useState<DateFilter>(
    () => (searchParams?.get("when") as DateFilter) ?? "all",
  )

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
  const activeFilterCount = [search, category, dateFilter !== "all"].filter(Boolean).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Discover events
          </h1>
          <p className="mt-1 text-muted-foreground">
            Concerts, theatre, comedy, festivals, and more — happening near you.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "event" : "events"}`}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search events, artists, venues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <label className="sr-only" htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filter-date">Date</label>
            <select
              id="filter-date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeFilterCount} active
            </span>
            {search && (
              <FilterChip label={`“${search}”`} onClear={() => setSearch("")} />
            )}
            {category && (
              <FilterChip label={category} onClear={() => setCategory("")} />
            )}
            {dateFilter !== "all" && (
              <FilterChip
                label={DATE_OPTIONS.find((o) => o.value === dateFilter)?.label ?? dateFilter}
                onClear={() => setDateFilter("all")}
              />
            )}
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-xs font-medium text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge variant="default" className="gap-1.5 pr-1.5">
      <span className="truncate max-w-[160px]">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label}`}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full",
          "hover:bg-primary/20",
        )}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="aspect-16/10 animate-pulse bg-muted" />
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
