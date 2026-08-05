"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Filter,
  Loader,
  Search,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProductCard, type ShopProductData } from "@/components/shop/product-card"
import { useCartBadgeCount } from "@/lib/shopCart"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type Product = ShopProductData

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
            padding. Cart moved down next to search (see filter row below) so
            it stays on the same row as search on mobile too. */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Shop
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Merch and gear from MyScope Events. Event specific items and storefronts in one feed.
          </p>
        </div>

        {/* Filter row — translucent card tone + backdrop-blur on the
            search and the chips so the ambient light beams flow through
            instead of being chopped off by solid dark surfaces. Matches
            the events page treatment. Search + cart always share a row
            (including on mobile); the rest of the filters wrap below on
            narrow screens via flex-col -> sm:flex-row. */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 sm:max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, organizers, events..."
                className="bg-card/30 pl-9 backdrop-blur-md focus:bg-card/50"
              />
            </div>
            <Button asChild variant="outline" size="icon" className="relative shrink-0">
              <Link href="/shop/cart" aria-label="Cart">
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
            </Button>
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
