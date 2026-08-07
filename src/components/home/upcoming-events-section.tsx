"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Calendar, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventCard, type EventCardData } from "@/components/events/event-card"
import { EventCardSkeleton } from "@/components/events/event-card-skeleton"
import { ProductCard, type ShopProductData } from "@/components/shop/product-card"
import { NAV_ITEMS } from "@/components/site/nav-items"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Same category list the top nav + /events page use — an "All" pill covers
// the unfiltered case. Tapping a pill re-fetches this section in place
// instead of sending the visitor to /events. Shop is appended separately
// below (not a category — swaps the grid to products instead of events).
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
  const searchParams = useSearchParams()
  const [mode, setMode] = React.useState<"events" | "shop">("events")
  const [category, setCategory] = React.useState("")
  const [events, setEvents] = React.useState(initialEvents)
  const [products, setProducts] = React.useState<ShopProductData[]>([])
  const [loading, setLoading] = React.useState(false)
  const isFirstRun = React.useRef(true)

  // Deep-link support: /?section=shop switches straight to the Shop pill and
  // scrolls this section into view — used by "Go to shop" links elsewhere
  // (e.g. the empty My Orders state) that now point here instead of /shop.
  React.useEffect(() => {
    if (searchParams.get("section") !== "shop") return
    setMode("shop")
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    // The server already fetched the "All" list — skip the redundant
    // duplicate request on mount.
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (mode !== "events") return
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
  }, [category, mode])

  React.useEffect(() => {
    if (mode !== "shop") return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_URL}/api/shop?limit=8`)
        const data = await res.json()
        if (!cancelled && data?.success) setProducts(data.data?.products ?? [])
      } catch {
        // Soft-fail — keep showing whatever was already there.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode])

  const selectCategory = (value: string) => {
    setMode("events")
    setCategory(value)
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {mode === "shop" ? "Shop" : "Upcoming events"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === "shop"
            ? "Merch and event extras from organizers across Sri Lanka."
            : "Handpicked happenings across Sri Lanka this month."}
        </p>
      </div>

      {/* Category pills — horizontally scrollable on mobile, same pattern as
          /events. Filters this section in place, no navigation. Shop is a
          separate mode (not a category) so it gets its own icon + pill. */}
      <div className="mb-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {CATEGORY_PILLS.map((pill) => {
          const active = mode === "events" && category === pill.category
          return (
            <button
              key={pill.label}
              type="button"
              onClick={() => selectCategory(pill.category)}
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
        <button
          type="button"
          onClick={() => setMode("shop")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            mode === "shop"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card/30 text-muted-foreground backdrop-blur-md hover:bg-muted hover:text-foreground",
          )}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Shop
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : mode === "shop" ? (
        products.length === 0 ? (
          <EmptyShop />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/shop">
                  View all in Shop <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </>
        )
      ) : events.length === 0 ? (
        <EmptyEvents onBrowseAll={() => selectCategory("")} />
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

function EmptyEvents({ onBrowseAll }: { onBrowseAll: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Calendar className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">No upcoming events right now</h3>
      <Button type="button" variant="outline" size="sm" onClick={onBrowseAll}>
        Browse all events
      </Button>
    </div>
  )
}

function EmptyShop() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShoppingBag className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">No products available right now</h3>
      <Button asChild variant="outline" size="sm">
        <Link href="/shop">Browse the shop</Link>
      </Button>
    </div>
  )
}
