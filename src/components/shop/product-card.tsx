"use client"

import Link from "next/link"
import { Calendar, ImageIcon, Package, Truck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type ShopProductStatus = "draft" | "published" | "sold_out" | "archived"

export interface ShopProductOrganizer {
  id: string
  business_name: string | null
  profile_image_url: string | null
  verified?: boolean
}

export interface ShopProductEvent {
  id: string
  title: string
  banner_url?: string | null
  start_time?: string | null
  venue_name?: string | null
}

export interface ShopProductData {
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
  status: ShopProductStatus
  organizer: ShopProductOrganizer | null
  event: ShopProductEvent | null
}

// Extracted from src/app/shop/page.tsx so the homepage's "Upcoming events"
// section can reuse the exact same card when its Shop pill is active —
// mirrors src/components/events/event-card.tsx, which /events and the
// homepage already both share for events.
//
// Visual treatment mirrors the event card so the shop grid reads as part of
// the same site, not a different surface:
//   * Sharp ring-1 + shadow-sm (no rounded-xl chrome)
//   * Portrait 3:4 banner with hover scale
//   * Floating badges top-right, organizer row under the image
//   * Price + CTA stacked at the bottom with rounded-none button
export function ProductCard({ product: p }: { product: ShopProductData }) {
  const cover = Array.isArray(p.images) && p.images[0]
  const soldOut = p.status === "sold_out" || p.stock_quantity <= 0

  return (
    <article className="group relative flex flex-col overflow-hidden bg-card text-card-foreground shadow-sm ring-1 ring-border/60 transition-all duration-200 hover:shadow-md hover:ring-primary/25">
      <Link
        href={`/shop/${p.id}`}
        className="relative block aspect-3/4 overflow-hidden bg-muted"
        aria-label={p.title}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}

        {soldOut && (
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <Badge variant="destructive">Sold out</Badge>
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
