"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, Loader, Search, Tag } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface ResultEvent {
  id: string
  title: string
  category?: string | null
  price?: number | null
  banner_url?: string | null
}

function formatDate(d?: Date) {
  if (!d) return ""
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Navbar search: a text input plus independent date-range and price-range
// icon buttons. Any combination of the three (typed text, a date range, a
// price range) drives ONE live results panel anchored under the input —
// results update in place as filters change, no navigation to /events. The
// date and price popovers are just pickers; there's no separate "search"
// step, picking a range is itself the filter.
export function NavSearch({
  className,
  onPrimary = false,
}: {
  className?: string
  // True when rendered directly on the solid --primary header bar (desktop
  // nav) — swaps the input/trigger colors for primary-foreground-based
  // tones so they read against a saturated violet background instead of the
  // neutral bg-muted styling used inside the mobile drawer's plain surface.
  onPrimary?: boolean
}) {
  const router = useRouter()

  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [dateOpen, setDateOpen] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)

  const [priceOpen, setPriceOpen] = React.useState(false)
  const [bounds, setBounds] = React.useState<{ min: number; max: number } | null>(null)
  const [priceRange, setPriceRange] = React.useState<[number, number] | null>(null)
  const [debouncedPriceRange, setDebouncedPriceRange] = React.useState<[number, number] | null>(null)
  const boundsFetched = React.useRef(false)

  const [resultsOpen, setResultsOpen] = React.useState(false)
  const [results, setResults] = React.useState<ResultEvent[]>([])
  const [loadingResults, setLoadingResults] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedPriceRange(priceRange), 300)
    return () => clearTimeout(t)
  }, [priceRange])

  const hasDate = !!(dateRange?.from || dateRange?.to)
  const hasPrice = !!(
    bounds &&
    debouncedPriceRange &&
    (debouncedPriceRange[0] !== bounds.min || debouncedPriceRange[1] !== bounds.max)
  )

  // Any of the three filters — typed text, a date range, a price range —
  // (re)runs this single fetch and drives the one results panel.
  React.useEffect(() => {
    if (!debouncedQuery && !hasDate && !hasPrice) {
      setResults([])
      setResultsOpen(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setLoadingResults(true)
        const params = new URLSearchParams({ upcoming: "true", limit: "8" })
        if (debouncedQuery) params.set("search", debouncedQuery)
        if (dateRange?.from) params.set("from", dateRange.from.toISOString())
        if (dateRange?.to) params.set("to", dateRange.to.toISOString())
        if (hasPrice && debouncedPriceRange) {
          params.set("minPrice", String(debouncedPriceRange[0]))
          params.set("maxPrice", String(debouncedPriceRange[1]))
        }
        const res = await fetch(`${API_URL}/api/events?${params.toString()}`)
        const data = await res.json()
        if (!cancelled && data?.success) {
          setResults(data.data.events || [])
          setResultsOpen(true)
        }
      } catch {
        // Soft-fail — the panel just shows no results.
      } finally {
        if (!cancelled) setLoadingResults(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, dateRange, hasPrice, debouncedPriceRange])

  // Price bounds are fetched once, lazily, the first time the price popover
  // opens — no point hitting the endpoint if the visitor never touches it.
  const ensureBounds = () => {
    if (boundsFetched.current) return
    boundsFetched.current = true
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/events/price-range`)
        const data = await res.json()
        if (data?.success) {
          const { min, max } = data.data
          setBounds({ min, max })
          setPriceRange([min, max])
          setDebouncedPriceRange([min, max])
        }
      } catch {
        // Soft-fail — price control just doesn't render its slider.
      }
    })()
  }

  const clearDate = () => setDateRange(undefined)
  const resetPrice = () => {
    if (!bounds) return
    setPriceRange([bounds.min, bounds.max])
    setDebouncedPriceRange([bounds.min, bounds.max])
  }

  const dateLabel = hasDate
    ? `${formatDate(dateRange?.from)}${dateRange?.to ? ` – ${formatDate(dateRange.to)}` : ""}`
    : "Dates"
  const priceLabel = hasPrice && debouncedPriceRange
    ? `LKR ${debouncedPriceRange[0].toLocaleString()}–${debouncedPriceRange[1].toLocaleString()}`
    : "Price"

  const goToEvent = (id: string) => {
    router.push(`/events/${id}`)
    setResultsOpen(false)
  }

  return (
    <div className={cn("flex w-full items-center gap-1.5 sm:gap-2", className)}>
      {/* Single results panel — anchored under the whole row, driven by
          whichever combination of text/date/price is currently set. */}
      <Popover open={resultsOpen} onOpenChange={setResultsOpen}>
        <PopoverAnchor asChild>
          <div className="relative min-w-0 flex-1">
            <Search
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                onPrimary && "dark:text-primary-foreground/70",
              )}
            />
            <input
              ref={inputRef}
              type="search"
              placeholder="Explore Events Book Tickets"
              value={query}
              onFocus={() => (debouncedQuery || hasDate || hasPrice) && setResultsOpen(true)}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault()
              }}
              className={cn(
                "h-9 w-full rounded-full border-none bg-muted/60 pl-10 pr-3 text-sm placeholder:text-muted-foreground transition-colors focus-visible:bg-background focus-visible:outline-none",
                onPrimary &&
                  "dark:bg-primary-foreground/15 dark:text-primary-foreground dark:placeholder:text-primary-foreground/60 dark:focus-visible:bg-primary-foreground/20",
              )}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-h-[70vh] w-[min(92vw,24rem)] overflow-y-auto p-2"
        >
          {loadingResults ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No events match these filters
            </p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToEvent(s.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                      {s.banner_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.banner_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {s.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.category || "Event"}
                        {s.price != null ? ` · LKR ${Number(s.price).toLocaleString()}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {/* Date range — independent trigger, usable with or without typed text */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={hasDate ? `Dates: ${dateLabel}` : "Select dates"}
            title={hasDate ? dateLabel : "Select dates"}
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-transparent transition-colors",
              hasDate
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
              onPrimary &&
                (hasDate
                  ? "dark:border-primary-foreground/60 dark:text-primary-foreground"
                  : "dark:text-primary-foreground/80 dark:hover:text-primary-foreground"),
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-auto p-3">
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Select dates
            </p>
            {hasDate && (
              <button
                type="button"
                onClick={clearDate}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={1}
            disabled={{ before: new Date() }}
          />
        </PopoverContent>
      </Popover>

      {/* Price range — independent trigger, usable with or without typed text */}
      <Popover
        open={priceOpen}
        onOpenChange={(next) => {
          setPriceOpen(next)
          if (next) ensureBounds()
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={hasPrice ? `Price: ${priceLabel}` : "Filter by price"}
            title={hasPrice ? priceLabel : "Filter by price"}
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-transparent transition-colors",
              hasPrice
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
              onPrimary &&
                (hasPrice
                  ? "dark:border-primary-foreground/60 dark:text-primary-foreground"
                  : "dark:text-primary-foreground/80 dark:hover:text-primary-foreground"),
            )}
          >
            <Tag className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-72 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Price range
            </p>
            {hasPrice && (
              <button
                type="button"
                onClick={resetPrice}
                className="text-xs font-medium text-primary hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          {!bounds || !priceRange ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : bounds.max > bounds.min ? (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                LKR {priceRange[0].toLocaleString()} – LKR {priceRange[1].toLocaleString()}
              </p>
              <Slider
                min={bounds.min}
                max={bounds.max}
                step={Math.max(1, Math.round((bounds.max - bounds.min) / 100))}
                value={priceRange}
                onValueChange={(v) => setPriceRange([v[0], v[1]])}
              />
            </>
          ) : (
            <p className="py-2 text-xs text-muted-foreground">No price range available yet.</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
