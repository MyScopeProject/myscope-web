"use client"

// Shared order-detail rendering, used both by the standalone order detail
// route (src/app/shop/orders/[id]/page.tsx — kept as a fallback deep link,
// e.g. for order-confirmation email links) and by the inline expand panel on
// the My Orders list (src/app/shop/orders/page.tsx), mirroring how My Events'
// booked-events-list.tsx expands its QR ticket inline instead of navigating.
//
// Split into two pieces (OrderMainDetails / OrderSidebar) so the standalone
// page can lay them out as a two-column grid while the inline list panel
// stacks them in a single column — same underlying markup either way, no
// duplicated logic.

import * as React from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ImageIcon,
  MapPin,
  Package,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type OrderStatus = "Pending" | "Confirmed" | "Cancelled" | "Refunded"
export type FulfillmentStatus = "pending" | "preparing" | "shipped" | "delivered" | "picked_up" | "returned"

export interface OrderItem {
  id: string
  product_id: string
  title_snapshot: string
  image_snapshot: string | null
  unit_price: number | string
  quantity: number
  line_total: number | string
  // Enriched at GET time for pickup orders. Null on shipping orders or when
  // the product no longer has a pickup_location. For event_product items the
  // backend fills these with the linked event's venue info.
  pickup_location?: string | null
  pickup_location_url?: string | null
  pickup_event?: { id: string; title: string; venue_name?: string | null } | null
}

export interface OrganizerInfo {
  id: string
  business_name: string | null
  profile_image_url: string | null
  phone?: string | null
  verified?: boolean
}

export interface OrderDetail {
  id: string
  order_reference: string
  status: OrderStatus
  payment_status: "Pending" | "Completed" | "Failed"
  fulfillment_status: FulfillmentStatus
  fulfillment_type: "shipping" | "pickup"
  subtotal: number | string
  discount_amount: number | string
  total_amount: number | string
  currency: string
  promo_code_snapshot: string | null
  shipping_address: {
    name?: string; phone?: string; line1?: string; line2?: string;
    city?: string; postal_code?: string; country?: string; notes?: string;
  } | null
  pickup_note: string | null
  buyer_email: string | null
  buyer_phone: string | null
  notes: string | null
  organizer_id: string
  cancelled_at: string | null
  fulfilled_at: string | null
  created_at: string
}

export const STATUS_META: Record<OrderStatus, { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }> = {
  Pending:   { label: "Awaiting payment", variant: "warning" },
  Confirmed: { label: "Paid",             variant: "success" },
  Cancelled: { label: "Cancelled",        variant: "outline" },
  Refunded:  { label: "Refunded",         variant: "destructive" },
}

export const FULFILLMENT_STEPS: Array<{ key: FulfillmentStatus; label: string; forType: Array<"shipping" | "pickup"> }> = [
  { key: "pending",    label: "Order received", forType: ["shipping", "pickup"] },
  { key: "preparing",  label: "Preparing",      forType: ["shipping", "pickup"] },
  { key: "shipped",    label: "Shipped",        forType: ["shipping"] },
  { key: "delivered",  label: "Delivered",      forType: ["shipping"] },
  { key: "picked_up",  label: "Picked up",      forType: ["pickup"] },
]

export function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return iso
  }
}

// Fulfillment timeline + line items + shipping/pickup info. The "main
// column" of the detail view.
export function OrderMainDetails({ order, items }: { order: OrderDetail; items: OrderItem[] }) {
  const visibleSteps = FULFILLMENT_STEPS.filter((s) => s.forType.includes(order.fulfillment_type))
  const currentIdx = visibleSteps.findIndex((s) => s.key === order.fulfillment_status)

  return (
    <div className="space-y-4">
      {order.status === "Confirmed" && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Fulfillment
          </h2>
          <ol className="mt-4 space-y-3">
            {visibleSteps.map((step, i) => {
              const done = i <= currentIdx
              const isCurrent = i === currentIdx
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isCurrent ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
          {order.fulfillment_status === "returned" && (
            <p className="mt-3 text-xs text-destructive">This order has been returned.</p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="py-3">
              <div className="flex items-center gap-3">
                <Link
                  href={`/shop/${it.product_id}`}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                >
                  {it.image_snapshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_snapshot} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-full w-full p-3 text-muted-foreground" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/shop/${it.product_id}`}
                    className="block truncate text-sm font-medium text-foreground hover:text-primary"
                  >
                    {it.title_snapshot}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    Qty {it.quantity} · {formatMoney(it.unit_price, order.currency)} each
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatMoney(it.line_total, order.currency)}
                </div>
              </div>

              {/* Per-item pickup details (only when order is pickup) */}
              {order.fulfillment_type === "pickup" && (it.pickup_location || it.pickup_event) && (
                <div className="mt-2 ml-[68px] rounded-lg border border-border bg-background/60 p-2.5">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Pickup at
                      </div>
                      <div className="mt-0.5 text-xs text-foreground">
                        {it.pickup_location || it.pickup_event?.venue_name || "—"}
                      </div>
                      {it.pickup_location_url && (
                        <a
                          href={it.pickup_location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          Open in maps
                        </a>
                      )}
                      {it.pickup_event && (
                        <Link
                          href={`/events/${it.pickup_event.id}`}
                          className="mt-1 block text-[10px] text-primary hover:underline"
                        >
                          View event details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Shipping or pickup info */}
      {order.fulfillment_type === "shipping" && order.shipping_address && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Truck className="h-4 w-4" />
            Shipping to
          </h2>
          <div className="mt-2 text-sm text-foreground">
            <p className="font-medium">{order.shipping_address.name}</p>
            <p className="text-muted-foreground">{order.shipping_address.phone}</p>
            <p className="mt-2 whitespace-pre-line text-foreground">
              {[order.shipping_address.line1, order.shipping_address.line2, order.shipping_address.city, order.shipping_address.postal_code, order.shipping_address.country]
                .filter(Boolean).join("\n")}
            </p>
            {order.shipping_address.notes && (
              <p className="mt-2 text-xs text-muted-foreground">Notes: {order.shipping_address.notes}</p>
            )}
          </div>
        </section>
      )}
      {order.fulfillment_type === "pickup" && order.pickup_note && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Package className="h-4 w-4" />
            Your pickup note
          </h2>
          <p className="mt-2 text-sm text-foreground">{order.pickup_note}</p>
        </section>
      )}
    </div>
  )
}

// Order total breakdown + seller card. The "sidebar" of the detail view.
export function OrderSidebar({ order, organizer }: { order: OrderDetail; organizer: OrganizerInfo | null }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </h2>
        <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
        {Number(order.discount_amount) > 0 && (
          <Row
            label={order.promo_code_snapshot ? `Promo ${order.promo_code_snapshot}` : "Discount"}
            value={`-${formatMoney(order.discount_amount, order.currency)}`}
            valueClass="text-success"
          />
        )}
        <div className="border-t border-border pt-2">
          <Row label={<span className="font-semibold">Total</span>}
               value={<span className="font-semibold">{formatMoney(order.total_amount, order.currency)}</span>} />
        </div>
      </section>

      {organizer && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Seller
          </h2>
          <div className="mt-3 flex items-start gap-3">
            {organizer.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organizer.profile_image_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Store className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">
                  {organizer.business_name || "Organizer"}
                </span>
                {organizer.verified && <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />}
              </div>
              <Link
                href={`/shop?organizerId=${order.organizer_id}`}
                className="text-xs text-primary hover:underline"
              >
                View storefront →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function Row({
  label, value, valueClass,
}: { label: React.ReactNode; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-foreground", valueClass)}>{value}</span>
    </div>
  )
}

// Compact, single-block variant used only by the inline expand panel on the
// My Orders list (src/app/shop/orders/page.tsx). The collapsed card header
// already shows order ref, fulfillment label, total, and placed-on date, so
// this consolidates everything else — fulfillment timeline, items, shipping/
// pickup info, subtotal/discount breakdown (no repeated total), and the
// seller card — into one bordered block with internal dividers instead of
// stacking OrderMainDetails + OrderSidebar as separate boxed sections.
export function OrderInlineDetail({
  order, items, organizer,
}: { order: OrderDetail; items: OrderItem[]; organizer: OrganizerInfo | null }) {
  const visibleSteps = FULFILLMENT_STEPS.filter((s) => s.forType.includes(order.fulfillment_type))
  const currentIdx = visibleSteps.findIndex((s) => s.key === order.fulfillment_status)
  const hasDiscount = Number(order.discount_amount) > 0

  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      {order.status === "Confirmed" && (
        <div className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Fulfillment progress
          </h2>
          <ol className="mt-4 space-y-3">
            {visibleSteps.map((step, i) => {
              const done = i <= currentIdx
              const isCurrent = i === currentIdx
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isCurrent ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
          {order.fulfillment_status === "returned" && (
            <p className="mt-3 text-xs text-destructive">This order has been returned.</p>
          )}
        </div>
      )}

      <div className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="py-3">
              <div className="flex items-center gap-3">
                <Link
                  href={`/shop/${it.product_id}`}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                >
                  {it.image_snapshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_snapshot} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-full w-full p-3 text-muted-foreground" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/shop/${it.product_id}`}
                    className="block truncate text-sm font-medium text-foreground hover:text-primary"
                  >
                    {it.title_snapshot}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    Qty {it.quantity} · {formatMoney(it.unit_price, order.currency)} each
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatMoney(it.line_total, order.currency)}
                </div>
              </div>

              {/* Per-item pickup details (only when order is pickup) */}
              {order.fulfillment_type === "pickup" && (it.pickup_location || it.pickup_event) && (
                <div className="mt-2 ml-[68px] rounded-lg border border-border bg-background/60 p-2.5">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Pickup at
                      </div>
                      <div className="mt-0.5 text-xs text-foreground">
                        {it.pickup_location || it.pickup_event?.venue_name || "—"}
                      </div>
                      {it.pickup_location_url && (
                        <a
                          href={it.pickup_location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          Open in maps
                        </a>
                      )}
                      {it.pickup_event && (
                        <Link
                          href={`/events/${it.pickup_event.id}`}
                          className="mt-1 block text-[10px] text-primary hover:underline"
                        >
                          View event details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Shipping or pickup info */}
      {order.fulfillment_type === "shipping" && order.shipping_address && (
        <div className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Truck className="h-4 w-4" />
            Shipping to
          </h2>
          <div className="mt-2 text-sm text-foreground">
            <p className="font-medium">{order.shipping_address.name}</p>
            <p className="text-muted-foreground">{order.shipping_address.phone}</p>
            <p className="mt-2 whitespace-pre-line text-foreground">
              {[order.shipping_address.line1, order.shipping_address.line2, order.shipping_address.city, order.shipping_address.postal_code, order.shipping_address.country]
                .filter(Boolean).join("\n")}
            </p>
            {order.shipping_address.notes && (
              <p className="mt-2 text-xs text-muted-foreground">Notes: {order.shipping_address.notes}</p>
            )}
          </div>
        </div>
      )}
      {order.fulfillment_type === "pickup" && order.pickup_note && (
        <div className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Package className="h-4 w-4" />
            Your pickup note
          </h2>
          <p className="mt-2 text-sm text-foreground">{order.pickup_note}</p>
        </div>
      )}

      {/* Price breakdown — total itself is already shown in the collapsed
          card header, so only the components that make it up (subtotal,
          discount) are repeated here. */}
      {hasDiscount && (
        <div className="space-y-1.5 p-5 text-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Price breakdown
          </h2>
          <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
          <Row
            label={order.promo_code_snapshot ? `Promo ${order.promo_code_snapshot}` : "Discount"}
            value={`-${formatMoney(order.discount_amount, order.currency)}`}
            valueClass="text-success"
          />
        </div>
      )}

      {organizer && (
        <div className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Seller
          </h2>
          <div className="mt-3 flex items-start gap-3">
            {organizer.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organizer.profile_image_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Store className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">
                  {organizer.business_name || "Organizer"}
                </span>
                {organizer.verified && <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />}
              </div>
              <Link
                href={`/shop?organizerId=${order.organizer_id}`}
                className="text-xs text-primary hover:underline"
              >
                View storefront →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
