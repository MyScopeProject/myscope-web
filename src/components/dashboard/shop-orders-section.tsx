"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  Loader,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type OrderStatus = "Pending" | "Confirmed" | "Cancelled" | "Refunded"
type FulfillmentStatus = "pending" | "preparing" | "shipped" | "delivered" | "picked_up" | "returned"

interface Order {
  id: string
  order_reference: string
  status: OrderStatus
  fulfillment_status: FulfillmentStatus
  fulfillment_type: "shipping" | "pickup"
  total_amount: number | string
  currency: string
  created_at: string
}

const STATUS_META: Record<OrderStatus, { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }> = {
  Pending:   { label: "Awaiting payment", variant: "warning" },
  Confirmed: { label: "Paid",             variant: "success" },
  Cancelled: { label: "Cancelled",        variant: "outline" },
  Refunded:  { label: "Refunded",         variant: "destructive" },
}

const FULFILLMENT_META: Record<FulfillmentStatus, { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }> = {
  pending:    { label: "Order received", variant: "outline" },
  preparing:  { label: "Preparing",      variant: "warning" },
  shipped:    { label: "Shipped",        variant: "success" },
  delivered:  { label: "Delivered",      variant: "success" },
  picked_up:  { label: "Picked up",      variant: "success" },
  returned:   { label: "Returned",       variant: "destructive" },
}

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return iso
  }
}

// Renders the 3 most recent shop orders inline plus a "View all" link. Hides
// itself entirely when the buyer has no orders, so the dashboard stays clean
// for users who haven't bought from the shop yet.
export function ShopOrdersSection() {
  const { token } = useAuth()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError]     = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_URL}/api/shop/orders/mine`, { credentials: "include" })
        const data = await res.json()
        if (cancelled) return
        if (data?.success) {
          setOrders(data.data?.orders ?? [])
        } else {
          setError(data?.message || "Couldn't load orders.")
        }
      } catch {
        if (!cancelled) setError("Network error.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <section>
        <div className="mb-5 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Shop orders</h2>
        </div>
        <div className="flex h-24 items-center justify-center rounded-xl border border-border bg-card">
          <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </section>
    )
  }

  // Hide finished orders (delivered/picked_up) — the buyer doesn't need them
  // surfacing on the dashboard. Also hide the entire section when there's
  // nothing active so the dashboard stays clean for users who don't shop.
  const activeOrders = React.useMemo(
    () => orders.filter((o) => !["delivered", "picked_up"].includes(o.fulfillment_status)),
    [orders],
  )
  if (activeOrders.length === 0 && !error) return null

  const recent = activeOrders.slice(0, 3)

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Shop orders</h2>
        </div>
        {activeOrders.length > 3 && (
          <Link
            href="/shop/orders"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all ({activeOrders.length}) <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <ul className="space-y-3">
          {recent.map((o) => (
            <li key={o.id}>
              <Link
                href={`/shop/orders/${o.id}`}
                className="group flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {o.fulfillment_type === "shipping" ? <Truck className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary">
                      {o.order_reference}
                    </span>
                    <Badge variant={STATUS_META[o.status].variant}>{STATUS_META[o.status].label}</Badge>
                    {o.status === "Confirmed" && (
                      <Badge variant={FULFILLMENT_META[o.fulfillment_status].variant}>
                        {FULFILLMENT_META[o.fulfillment_status].label}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(o.created_at)}</span>
                    <span>·</span>
                    <span className="capitalize">{o.fulfillment_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-foreground">
                    {formatMoney(o.total_amount, o.currency)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
