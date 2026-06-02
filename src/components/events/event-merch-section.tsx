"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, ImageIcon, ShoppingBag } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface MerchProduct {
  id: string
  title: string
  price: number | string
  currency: string
  stock_quantity: number
  status: "draft" | "published" | "sold_out" | "archived"
  images: string[]
  category: string | null
}

// Section that renders nothing when the event has no published merch — caller
// doesn't need to gate. Keeps the event page edit to a single import + line.
export function EventMerchSection({ eventId }: { eventId: string }) {
  const [products, setProducts] = React.useState<MerchProduct[]>([])
  const [loading, setLoading]   = React.useState(true)

  React.useEffect(() => {
    if (!eventId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/shop/events/${eventId}/products`)
        const data = await res.json()
        if (cancelled) return
        if (data?.success) {
          setProducts(data.data?.products ?? [])
        }
      } catch { /* silently hide section on error */ }
      finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [eventId])

  if (loading || products.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Event merch</h2>
        </div>
        <Link
          href={`/shop?eventId=${eventId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Compact merch grid — mirrors the public shop card style (sharp
          corners, ring + shadow, portrait 3:4 with gradient lift) but
          drops the chips and CTA since these are teaser cards. The wider
          card lives on /shop. */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {products.slice(0, 4).map((p) => {
          const cover = Array.isArray(p.images) && p.images[0]
          const soldOut = p.status === "sold_out" || p.stock_quantity <= 0
          return (
            <Link
              key={p.id}
              href={`/shop/${p.id}`}
              className="group flex flex-col overflow-hidden bg-card text-card-foreground shadow-sm ring-1 ring-border/60 transition-all duration-200 hover:shadow-md hover:ring-primary/25"
            >
              <div className="relative aspect-3/4 overflow-hidden bg-muted">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
                {soldOut && (
                  <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                    Sold out
                  </span>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/40 via-black/10 to-transparent" />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <div className="line-clamp-2 text-xs font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {p.title}
                </div>
                <div className="mt-auto pt-1">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.currency}
                  </div>
                  <div className="font-heading text-sm font-bold leading-tight tracking-tight text-foreground">
                    {Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
