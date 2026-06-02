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
  ShieldCheck,
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

function FulfillmentChips({ value }: { value: Product["fulfillment"] }) {
  const showShipping = value === "shipping" || value === "both"
  const showPickup   = value === "pickup"   || value === "both"
  return (
    <div className="flex flex-wrap gap-1.5 text-[10px]">
      {showShipping && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-muted-foreground">
          <Truck className="h-3 w-3" /> Shipping
        </span>
      )}
      {showPickup && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-muted-foreground">
          <Package className="h-3 w-3" /> Event pickup
        </span>
      )}
    </div>
  )
}

// Next 16 requires useSearchParams() callers to sit inside a Suspense
// boundary, otherwise the page bails out of static prerendering and the
// build fails. Wrapping the inner component keeps the bail-out narrow.
export default function ShopPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background pt-24" aria-hidden />}>
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

  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Shop
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
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
        </header>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, organizers, events..."
              className="pl-9"
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
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  typeFilter === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function ProductCard({ product: p }: { product: Product }) {
  const cover = Array.isArray(p.images) && p.images[0]
  const soldOut = p.status === "sold_out" || p.stock_quantity <= 0

  return (
    <Link
      href={`/shop/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ImageIcon className="h-full w-full p-12 text-muted-foreground" />
        )}
        {soldOut && (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground">
            Sold out
          </span>
        )}
        {p.product_type === "event_product" && p.event && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
            <Calendar className="h-3 w-3" /> Event merch
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
            {p.title}
          </h3>
        </div>

        <div className="text-sm font-semibold text-foreground">
          {formatMoney(p.price, p.currency)}
        </div>

        <FulfillmentChips value={p.fulfillment} />

        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          {p.organizer?.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.organizer.profile_image_url}
              alt=""
              className="h-5 w-5 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="h-5 w-5 shrink-0 rounded-full bg-muted" />
          )}
          <span className="truncate">{p.organizer?.business_name || "Organizer"}</span>
          {p.organizer?.verified && (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Verified" />
          )}
        </div>

        {p.event && (
          <div className="truncate text-xs text-muted-foreground">
            <Calendar className="mr-1 inline h-3 w-3" />
            {p.event.title}
          </div>
        )}
      </div>
    </Link>
  )
}
