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

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {products.slice(0, 4).map((p) => {
          const cover = Array.isArray(p.images) && p.images[0]
          const soldOut = p.status === "sold_out" || p.stock_quantity <= 0
          return (
            <Link
              key={p.id}
              href={`/shop/${p.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50"
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
                  <ImageIcon className="h-full w-full p-10 text-muted-foreground" />
                )}
                {soldOut && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground">
                    Sold out
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <div className="line-clamp-2 text-xs font-semibold text-foreground group-hover:text-primary">
                  {p.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(p.price, p.currency)}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
