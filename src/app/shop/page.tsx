"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Calendar,
  Filter,
  ImageIcon,
  Loader,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Truck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCartBadgeCount } from "@/lib/shopCart"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type ProductStatus = "draft" | "published" | "sold_out" | "archived"

interface Organizer {
  id: string
  business_name: string | null
  profile_image_url: string | null
  verified?: boolean
}

interface ProductEvent {
  id: string
  title: string
  banner_url?: string | null
  start_time?: string | null
  venue_name?: string | null
}

interface Product {
  id: string
  product_type: "event_product" | "shop_product"
  title: string
  description: string | null
  price: number | string
  currency: string
  stock_quantity: number
  fulfillment: "shipping" | "pickup" | "both"
  images: string[]
  category: string | null
  status: ProductStatus
  organizer: Organizer | null
  event: ProductEvent | null
}

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Next 16 requires useSearchParams() callers to sit inside a Suspense
// boundary, otherwise the page bails out of static prerendering and the
// build fails. Wrapping the inner component keeps the bail-out narrow.
export default function ShopPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen pt-24" aria-hidden />}>
      <ShopPageInner />
    </React.Suspense>
  )
}

function ShopPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cartCount = useCartBadgeCount()
  const eventId    = searchParams.get("eventId") || ""
  const orgId      = searchParams.get("organizerId") || ""
  const typeParam  = searchParams.get("productType") || ""
  const categoryParam = searchParams.get("category") || ""

  const [products, setProducts]   = React.useState<Product[]>([])
  const [loading, setLoading]     = React.useState(true)
  const [error, setError]         = React.useState("")
  const [search, setSearch]       = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<"all" | "event_product" | "shop_product">(
    typeParam === "event_product" || typeParam === "shop_product" ? typeParam : "all",
  )

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError("")
        const qs = new URLSearchParams()
        if (eventId) qs.set("eventId", eventId)
        if (orgId)   qs.set("organizerId", orgId)
        if (categoryParam) qs.set("category", categoryParam)
        if (typeFilter !== "all") qs.set("productType", typeFilter)
        const res = await fetch(`${API_URL}/api/shop?${qs.toString()}`)
        const data = await res.json()
        if (cancelled) return
        if (data?.success) {
          setProducts(data.data?.products ?? [])
        } else {
          setError(data?.message || "Couldn't load shop.")
        }
      } catch {
        if (!cancelled) setError("Network error.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [eventId, orgId, categoryParam, typeFilter])

  const visible = React.useMemo(() => {
    if (!search.trim()) return products
    const q = search.trim().toLowerCase()
    return products.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.organizer?.business_name?.toLowerCase().includes(q) ||
      p.event?.title?.toLowerCase().includes(q),
    )
  }, [products, search])

  // No `bg-background` on <main> — the page stays transparent so the
  // global LightBeamsBackground (mounted in the root layout) shows
  // through. The body already provides the base bg.
  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Title block — placement + typography mirror /events: title +
            subtitle sit at the top of the container with no extra navbar
            padding. The cart button floats to the right on wider screens
            and drops to a new line on phones via flex-wrap. */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Shop
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Merch and gear from MyScope Events. Event specific items and storefronts in one feed.
            </p>
          </div>
          <Button asChild variant="outline" className="relative">
            <Link href="/shop/cart" className="inline-flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </Button>
        </div>

        {/* Filter row — translucent card tone + backdrop-blur on the
            search and the chips so the ambient light beams flow through
            instead of being chopped off by solid dark surfaces. Matches
            the events page treatment. */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, organizers, events..."
              className="bg-card/30 pl-9 backdrop-blur-md focus:bg-card/50"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Show:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "event_product", "shop_product"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors",
                  typeFilter === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card/30 text-muted-foreground hover:bg-card/50 hover:text-foreground",
                )}
              >
                {t === "all" ? "All" : t === "event_product" ? "Event merch" : "Storefronts"}
              </button>
            ))}
          </div>
          {(eventId || orgId || categoryParam) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/shop")}
              className="text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">No products yet</h2>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// ProductCard — mirrors the event-card visual treatment so the shop grid
// reads as part of the same site, not a different surface:
//   * Sharp ring-1 + shadow-sm (no rounded-xl chrome)
//   * Portrait 3:4 banner with gradient lift + hover scale
//   * Floating badges top-right, organizer pill bottom-left over the image
//   * Tight info block with category pill, title, fulfillment chips
//   * Price + CTA stacked at the bottom with rounded-none button
function ProductCard({ product: p }: { product: Product }) {
  const cover = Array.isArray(p.images) && p.images[0]
  const soldOut = p.status === "sold_out" || p.stock_quantity <= 0
  const isEventMerch = p.product_type === "event_product" && !!p.event

  return (
    <article className="group relative flex flex-col overflow-hidden bg-card text-card-foreground shadow-sm ring-1 ring-border/60 transition-all duration-200 hover:shadow-md hover:ring-primary/25">
      {/* Cover — portrait 3:4. Image is contained (no crop) and sits on
          the card surface itself so there's no dark frame around it. */}
      <Link
        href={`/shop/${p.id}`}
        className="relative block aspect-3/4 overflow-hidden bg-card"
        aria-label={p.title}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={p.title}
            className="h-full w-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}

        {/* Floating badges — top-right */}
        {(isEventMerch || soldOut) && (
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            {isEventMerch && <Badge variant="default">Event merch</Badge>}
            {soldOut && <Badge variant="destructive">Sold out</Badge>}
          </div>
        )}
      </Link>

      {/* Info block — matches event-card spacing/typography */}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        {/* Category + fulfillment chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {p.category && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary sm:px-2.5 sm:text-[10px]">
              {p.category}
            </span>
          )}
          {(p.fulfillment === "shipping" || p.fulfillment === "both") && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[9px] font-medium text-muted-foreground sm:text-[10px]">
              <Truck className="h-2.5 w-2.5" /> Shipping
            </span>
          )}
          {(p.fulfillment === "pickup" || p.fulfillment === "both") && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[9px] font-medium text-muted-foreground sm:text-[10px]">
              <Package className="h-2.5 w-2.5" /> Pickup
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/shop/${p.id}`} className="-mt-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base">
            {p.title}
          </h3>
        </Link>

        {/* Organizer — moved out of the image so the product cover stays
            clean (no dark gradient overlay). Same compact row used elsewhere
            for "who is selling this". */}
        {p.organizer && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
            {p.organizer.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.organizer.profile_image_url}
                alt=""
                className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="h-4 w-4 shrink-0 rounded-full bg-muted ring-1 ring-border" />
            )}
            <span className="line-clamp-1 font-medium">
              {p.organizer.business_name || "Organizer"}
            </span>
            {p.organizer.verified && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/Images/verified badge.png"
                alt="Verified"
                className="h-3.5 w-3.5 shrink-0"
              />
            )}
          </div>
        )}

        {/* Linked event (when present) */}
        {p.event && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{p.event.title}</span>
          </div>
        )}

        {/* Price + CTA — same footer pattern as the event card */}
        <div className="mt-auto space-y-2 border-t border-border pt-2 sm:space-y-3 sm:pt-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
              {p.currency}
            </div>
            <div className="truncate font-heading text-base font-bold leading-tight tracking-tight text-foreground sm:text-xl">
              {Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant={soldOut ? "outline" : "default"}
            className="w-full rounded-none text-xs sm:text-sm"
            disabled={soldOut}
          >
            <Link href={`/shop/${p.id}`}>
              {soldOut ? "Sold out" : "View product"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}
