"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  ExternalLink,
  ImageIcon,
  Loader,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useShopCart } from "@/lib/shopCart"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Organizer {
  id: string
  business_name: string | null
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
  description: string | null
  price: number | string
  currency: string
  stock_quantity: number
  fulfillment: "shipping" | "pickup" | "both"
  pickup_location: string | null
  pickup_location_url: string | null
  images: string[]
  category: string | null
  status: "draft" | "published" | "sold_out" | "archived"
  organizer: Organizer | null
  event: ProductEvent | null
}

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params!.id[0] : ""

  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError]     = React.useState("")
  const [activeImage, setActiveImage] = React.useState(0)
  const [qty, setQty] = React.useState(1)
  const [justAdded, setJustAdded] = React.useState(false)
  const { cart, add } = useShopCart(product?.organizer?.id ?? null)
  const inCart = cart.find(c => c.product_id === product?.id)

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError("")
        const res = await fetch(`${API_URL}/api/shop/${id}`)
        const data = await res.json()
        if (cancelled) return
        if (data?.success) {
          setProduct(data.data?.product)
        } else {
          setError(data?.message || "Product not found.")
        }
      } catch {
        if (!cancelled) setError("Network error.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-background pt-24 pb-20">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold text-foreground">
              {error || "Product not found"}
            </h1>
            <Button asChild className="mt-4">
              <Link href="/shop">Back to shop</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : []
  const cover = images[activeImage] || images[0]
  const soldOut = product.status === "sold_out" || product.stock_quantity <= 0

  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to shop
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-full w-full p-24 text-muted-foreground" />
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "aspect-square overflow-hidden rounded-lg border transition-colors",
                      i === activeImage
                        ? "border-primary"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            <div>
              {product.category && (
                <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {product.category}
                </div>
              )}
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {product.title}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-semibold text-foreground">
                  {formatMoney(product.price, product.currency)}
                </span>
                {soldOut && <Badge variant="warning">Sold out</Badge>}
                {!soldOut && product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                  <Badge variant="outline">Only {product.stock_quantity} left</Badge>
                )}
              </div>
            </div>

            {/* Fulfillment availability — what the organizer offers. Once
                checkout lands in Phase 2 this is where the buyer picks one.
                For shop products the pickup point is shown inline; for event
                products the pickup is implicitly at the linked event's venue. */}
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Available via
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {(product.fulfillment === "shipping" || product.fulfillment === "both") && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground">
                    <Truck className="h-3.5 w-3.5" /> Shipping
                  </span>
                )}
                {(product.fulfillment === "pickup" || product.fulfillment === "both") && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground">
                    <Package className="h-3.5 w-3.5" />
                    {product.product_type === "event_product" ? "Event pickup" : "Pickup"}
                  </span>
                )}
              </div>

              {/* Shop-product pickup details */}
              {product.product_type === "shop_product" &&
               (product.fulfillment === "pickup" || product.fulfillment === "both") &&
               product.pickup_location && (
                <div className="mt-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Pickup at
                      </div>
                      <div className="mt-0.5 text-sm text-foreground">{product.pickup_location}</div>
                      {product.pickup_location_url && (
                        <a
                          href={product.pickup_location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Open in maps
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {product.description && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  About this item
                </h2>
                <p className="whitespace-pre-line text-sm text-foreground/90">{product.description}</p>
              </section>
            )}

            {/* Linked event */}
            {product.event && (
              <Link
                href={`/events/${product.event.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/50"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {product.event.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.event.banner_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Calendar className="h-full w-full p-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Event merch — from
                  </div>
                  <div className="truncate font-medium text-foreground">{product.event.title}</div>
                  {product.event.venue_name && (
                    <div className="truncate text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {product.event.venue_name}
                    </div>
                  )}
                </div>
              </Link>
            )}

            {/* Buy CTA — Phase 2 cart-driven flow. Login-required checkout
                lives on the cart page; the product page just stages the add. */}
            {product.organizer && (
              <section className="rounded-xl border border-border bg-card p-4">
                {!soldOut && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                        className="p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[2ch] px-2 text-center text-sm font-medium text-foreground">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.min(product.stock_quantity, q + 1))}
                        disabled={qty >= product.stock_quantity}
                        className="p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Button
                      onClick={() => {
                        add({
                          product_id:   product.id,
                          organizer_id: product.organizer!.id,
                          title:        product.title,
                          image:        product.images?.[0] || null,
                          unit_price:   Number(product.price),
                          currency:     product.currency,
                          quantity:     qty,
                          fulfillment:  product.fulfillment,
                        })
                        setJustAdded(true)
                        setTimeout(() => setJustAdded(false), 1500)
                      }}
                      className="flex-1 min-w-[10rem]"
                    >
                      {justAdded ? (
                        <><Check className="mr-1.5 h-4 w-4" /> Added</>
                      ) : (
                        <><ShoppingCart className="mr-1.5 h-4 w-4" /> Add to cart</>
                      )}
                    </Button>
                  </div>
                )}
                {soldOut && (
                  <Button disabled className="w-full">
                    Sold out
                  </Button>
                )}

                {inCart && (
                  <Link
                    href={`/shop/cart`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {inCart.quantity} in cart — view cart →
                  </Link>
                )}

                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  {product.organizer.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.organizer.profile_image_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-xs font-semibold text-foreground">
                        {product.organizer.business_name || "Organizer"}
                      </div>
                      {product.organizer.verified && (
                        <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />
                      )}
                    </div>
                    <Link
                      href={`/shop?organizerId=${product.organizer.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View storefront →
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
