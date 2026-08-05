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

// Navbar search: one unified pill — date-range and price-range icon+chevron
// segments on the left, a plain text field in the middle, and a solid
// search button on the right (same shape language as a typical booking-site
// search bar: icon dropdowns | input | CTA button). Any combination of the
// three (typed text, a date range, a price range) drives ONE live results
// panel anchored under the input — results update in place, no navigation
// to /events. The date/price popovers are just pickers; picking a range is
// itself the filter, no separate "apply" step.
export function NavSearch({
  className,
  onPrimary = false,
}: {
  className?: string
  // True when rendered directly on the solid --primary/brand-violet header
  // bar (desktop nav) — adds dark-mode-only primary-foreground contrast
  // tones so it reads against a saturated background instead of the neutral
  // styling used inside the mobile drawer's plain surface.
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

  // Search button — bypasses the debounce so a click reacts immediately
  // instead of waiting out the 300ms typing delay.
  const runSearchNow = () => {
    const trimmed = query.trim()
    setDebouncedQuery(trimmed)
    if (trimmed || hasDate || hasPrice) setResultsOpen(true)
    inputRef.current?.focus()
  }

  const segmentBase =
    "flex shrink-0 items-center gap-1 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
  const segmentOnPrimary = onPrimary && "dark:text-primary-foreground/80 dark:hover:text-primary-foreground"
  const segmentActive = "text-primary"
  const segmentActiveOnPrimary = onPrimary && "dark:text-primary-foreground"

  return (
    <div
      className={cn(
        "flex h-11 w-full items-stretch overflow-hidden rounded-full border border-border bg-card/50",
        onPrimary && "dark:border-primary-foreground/20 dark:bg-primary-foreground/10",
        className,
      )}
    >
      {/* Date range — independent trigger, usable with or without typed text */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={hasDate ? `Dates: ${dateLabel}` : "Select dates"}
            className={cn(segmentBase, segmentOnPrimary, hasDate && cn(segmentActive, segmentActiveOnPrimary))}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={10} className="w-auto p-3">
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

      <span
        className={cn(
          "my-2.5 w-px shrink-0 bg-border",
          onPrimary && "dark:bg-primary-foreground/20",
        )}
      />

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
            className={cn(segmentBase, segmentOnPrimary, hasPrice && cn(segmentActive, segmentActiveOnPrimary))}
          >
            <Tag className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={10} className="w-72 p-3">
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

      <span
        className={cn(
          "my-2.5 w-px shrink-0 bg-border",
          onPrimary && "dark:bg-primary-foreground/20",
        )}
      />

      {/* Single results panel — anchored under the input, driven by
          whichever combination of text/date/price is currently set. */}
      <Popover open={resultsOpen} onOpenChange={setResultsOpen}>
        <PopoverAnchor asChild>
          <input
            ref={inputRef}
            type="search"
            placeholder="Explore Events Book Tickets"
            value={query}
            onFocus={() => (debouncedQuery || hasDate || hasPrice) && setResultsOpen(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                runSearchNow()
              }
            }}
            className={cn(
              "min-w-0 flex-1 bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none",
              onPrimary && "dark:text-primary-foreground dark:placeholder:text-primary-foreground/60",
            )}
          />
        </PopoverAnchor>

        <PopoverContent
          align="start"
          sideOffset={10}
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

      {/* Search button — solid fill, full-height, flush against the pill's
          right edge (same shape language as the reference design). */}
      <button
        type="button"
        aria-label="Search"
        onClick={runSearchNow}
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary px-5 text-primary-foreground transition-colors hover:bg-primary/90",
          onPrimary &&
            "dark:bg-primary-foreground dark:text-[oklch(0.37_0.17_302)] dark:hover:bg-primary-foreground/90",
        )}
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  )
}
