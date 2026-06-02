"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Facebook,
  ImageIcon,
  Instagram,
  Loader,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Organizer {
  id: string
  business_name: string | null
  business_type?: string | null
  profile_image_url: string | null
  phone?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
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
  price: number | string
  currency: string
  stock_quantity: number
  fulfillment: "shipping" | "pickup" | "both"
  images: string[]
  category: string | null
  status: "draft" | "published" | "sold_out" | "archived"
  event?: ProductEvent | null
}

type TypeFilter = "all" | "event_product" | "shop_product"

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function normalizeSocialUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null
  if (s.startsWith("http://") || s.startsWith("https://")) return s
  return `https://${s}`
}

export default function StorefrontPage() {
  const params = useParams()
  const organizerId = typeof params?.id === "string"
    ? params.id
    : Array.isArray(params?.id) ? params!.id[0] : ""

  const [organizer, setOrganizer] = React.useState<Organizer | null>(null)
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading]   = React.useState(true)
  const [error, setError]       = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all")

  React.useEffect(() => {
    if (!organizerId) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError("")
        const res = await fetch(`${API_URL}/api/shop/organizers/${organizerId}`)
        const data = await res.json()
        if (cancelled) return
        if (data?.success) {
          setOrganizer(data.data?.organizer || null)
          setProducts(data.data?.products ?? [])
        } else {
          setError(data?.message || "Couldn't load storefront.")
        }
      } catch {
        if (!cancelled) setError("Network error.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [organizerId])

  const visible = React.useMemo(() => {
    if (typeFilter === "all") return products
    return products.filter(p => p.product_type === typeFilter)
  }, [products, typeFilter])

  const counts = React.useMemo(() => ({
    all:           products.length,
    event_product: products.filter(p => p.product_type === "event_product").length,
    shop_product:  products.filter(p => p.product_type === "shop_product").length,
  }), [products])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (error || !organizer) {
    return (
      <main className="min-h-screen bg-background pt-24 pb-20">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Store className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold text-foreground">{error || "Storefront not found"}</h1>
            <Button asChild className="mt-4">
              <Link href="/shop">Back to shop</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const facebookUrl  = normalizeSocialUrl(organizer.facebook_url)
  const instagramUrl = normalizeSocialUrl(organizer.instagram_url)

  return (
    <main className="min-h-screen bg-background pt-20 pb-20">
      {/* Hero strip — soft gradient with profile chip overlay. Uses theme tokens
          so it shifts with light/dark. */}
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-r from-primary/15 via-primary/8 to-transparent sm:h-56">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.18),transparent_60%)]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/shop"
          className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to shop
        </Link>

        {/* Profile row — overlaps the hero strip a little. */}
        <header className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-16">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-card shadow-lg sm:h-28 sm:w-28">
            {organizer.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organizer.profile_image_url}
                alt={organizer.business_name || "Organizer"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {organizer.business_name || "Organizer"}
              </h1>
              {organizer.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
            {organizer.business_type && (
              <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
                {organizer.business_type}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span>{counts.all} {counts.all === 1 ? "product" : "products"}</span>
            </div>
          </div>

          {/* Contact + socials */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {organizer.phone && (
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${organizer.phone}`} className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </a>
              </Button>
            )}
            {facebookUrl && (
              <Button asChild variant="ghost" size="icon" aria-label="Facebook">
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-4 w-4" />
                </a>
              </Button>
            )}
            {instagramUrl && (
              <Button asChild variant="ghost" size="icon" aria-label="Instagram">
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </header>

        {/* Filter row */}
        {products.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-1.5">
            {(["all", "shop_product", "event_product"] as const).map((t) => (
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
                {t === "all" ? "All" : t === "event_product" ? "Event merch" : "Storefront"}
                <span className="ml-1.5 text-[10px] text-muted-foreground">({counts[t]})</span>
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">
              {products.length === 0 ? "No products yet" : "Nothing in this filter"}
            </h2>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <StorefrontCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// Storefront card — uses the same visual treatment as the main catalog card,
// minus the organizer chip overlay (everything here belongs to one organizer).
function StorefrontCard({ product: p }: { product: Product }) {
  const cover = Array.isArray(p.images) && p.images[0]
  const soldOut = p.status === "sold_out" || p.stock_quantity <= 0
  const isEventMerch = p.product_type === "event_product" && !!p.event

  return (
    <article className="group relative flex flex-col overflow-hidden bg-card text-card-foreground shadow-sm ring-1 ring-border/60 transition-all duration-200 hover:shadow-md hover:ring-primary/25">
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

        {(isEventMerch || soldOut) && (
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            {isEventMerch && <Badge variant="default">Event merch</Badge>}
            {soldOut && <Badge variant="destructive">Sold out</Badge>}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
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

        <Link href={`/shop/${p.id}`} className="-mt-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base">
            {p.title}
          </h3>
        </Link>

        {p.event && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{p.event.title}</span>
          </div>
        )}

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
