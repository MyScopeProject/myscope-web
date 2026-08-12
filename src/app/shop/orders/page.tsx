"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type OrderStatus = "Pending" | "Confirmed" | "Cancelled" | "Refunded"
type FulfillmentStatus = "pending" | "preparing" | "shipped" | "delivered" | "picked_up" | "returned"

interface Order {
  id: string
  order_reference: string
  status: OrderStatus
  payment_status: "Pending" | "Completed" | "Failed"
  fulfillment_status: FulfillmentStatus
  fulfillment_type: "shipping" | "pickup"
  subtotal: number | string
  total_amount: number | string
  currency: string
  created_at: string
}

const STATUS_META: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  Pending:   { label: "Awaiting payment", variant: "warning" },
  Confirmed: { label: "Paid",             variant: "success" },
  Cancelled: { label: "Cancelled",        variant: "destructive" },
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

// Filter tabs mirror the "My Events" pattern (see booked-events-list.tsx):
// Pending / Confirmed / Cancelled buckets with live counts. Orders whose
// fulfillment has already completed (delivered / picked up) are archived
// out of all tabs — the buyer already received the goods, same "no longer
// actionable" rule My Events applies to fully-attended past bookings.
const FILTERS = ["Confirmed", "Pending", "Cancelled"] as const
type Filter = (typeof FILTERS)[number]

const bucketOf = (o: Order): Filter | null => {
  if (["delivered", "picked_up"].includes(o.fulfillment_status)) return null
  if (o.status === "Confirmed") return "Confirmed"
  if (o.status === "Pending") return "Pending"
  if (o.status === "Cancelled" || o.status === "Refunded") return "Cancelled"
  return null
}

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

export default function MyOrdersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("Confirmed")
  const didInitFilter = React.useRef(false)

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent("/shop/orders")}`)
    }
  }, [authLoading, user, router])

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/shop/orders/mine`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setOrders(data.data?.orders ?? [])
      } else {
        setError(data?.message || "Couldn't load orders.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (user) fetchOrders()
  }, [user, fetchOrders])

  const counts = React.useMemo(() => {
    const c: Record<Filter, number> = { Confirmed: 0, Pending: 0, Cancelled: 0 }
    for (const o of orders) {
      const k = bucketOf(o)
      if (k) c[k]++
    }
    return c
  }, [orders])

  const visible = React.useMemo(
    () => orders.filter((o) => bucketOf(o) === filter),
    [orders, filter],
  )

  // Land on the first tab that actually has orders, same as My Events.
  React.useEffect(() => {
    if (didInitFilter.current || loading || orders.length === 0) return
    didInitFilter.current = true
    const first = FILTERS.find((f) => counts[f] > 0)
    if (first) setFilter(first)
  }, [loading, orders, counts])

  if (authLoading || (!user && !error)) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    )
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground">Track payment &amp; fulfillment for your shop purchases</p>
        </div>
        {orders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f
              const count = counts[f]
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                    (active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted")
                  }
                >
                  {f}
                  <span className={active ? "text-primary" : "text-muted-foreground/70"}>{count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={fetchOrders}
            className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingBag className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {orders.length === 0 ? "No orders yet" : `No ${filter.toLowerCase()} orders`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {orders.length === 0
                ? "Browse the shop and order something to see it here."
                : "Try another tab above."}
            </p>
          </div>
          {orders.length === 0 && (
            <Link
              href="/?section=shop"
              className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Go to shop
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </section>
  )
}

function OrderCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status]

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/shop/orders/${order.id}`} className="group flex">
        {/* Thumbnail */}
        <div className="hidden w-32 shrink-0 items-center justify-center bg-muted text-muted-foreground sm:flex">
          {order.fulfillment_type === "shipping" ? <Truck className="h-8 w-8" /> : <Package className="h-8 w-8" />}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 p-4 sm:border-l sm:border-dashed sm:border-border">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={meta.variant} className="text-xs">{meta.label}</Badge>
            {order.status === "Confirmed" && (
              <Badge variant={FULFILLMENT_META[order.fulfillment_status].variant} className="text-xs">
                {FULFILLMENT_META[order.fulfillment_status].label}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">{order.fulfillment_type}</Badge>
          </div>

          <p className="mt-1.5 truncate font-mono text-base font-semibold text-foreground">
            {order.order_reference}
          </p>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(order.created_at)}
            </span>
          </div>

          {/* Order details */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
            <Detail label="Order ref" value={order.order_reference} mono />
            <Detail label="Fulfillment" value={FULFILLMENT_META[order.fulfillment_status].label} />
            <Detail label="Total" value={formatMoney(order.total_amount, order.currency)} />
            <Detail label="Placed on" value={formatDate(order.created_at)} />
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
              View order <ArrowRight className="h-3.5 w-3.5" />
            </span>
            {order.status === "Pending" && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Payment required</span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"truncate text-foreground " + (mono ? "font-mono" : "font-medium")}>{value}</div>
    </div>
  )
}
