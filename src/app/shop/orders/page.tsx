"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Calendar,
  Loader,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Order {
  id: string
  order_reference: string
  status: "Pending" | "Confirmed" | "Cancelled" | "Refunded"
  payment_status: "Pending" | "Completed" | "Failed"
  fulfillment_status: "pending" | "preparing" | "shipped" | "delivered" | "picked_up" | "returned"
  fulfillment_type: "shipping" | "pickup"
  subtotal: number | string
  total_amount: number | string
  currency: string
  created_at: string
}

const STATUS_META: Record<
  Order["status"],
  { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }
> = {
  Pending:   { label: "Awaiting payment", variant: "warning" },
  Confirmed: { label: "Paid",             variant: "success" },
  Cancelled: { label: "Cancelled",        variant: "outline" },
  Refunded:  { label: "Refunded",         variant: "destructive" },
}

const FULFILLMENT_META: Record<
  Order["fulfillment_status"],
  { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }
> = {
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

export default function MyOrdersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent("/shop/orders")}`)
    }
  }, [authLoading, user, router])

  React.useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
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
  }, [user])

  if (authLoading || (!user && !error)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <ShoppingBag className="h-6 w-6 text-primary" />
          My Orders
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track payment + fulfillment status across all your shop purchases.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">No orders yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Browse the shop and order something to see it here.
          </p>
          <Button asChild className="mt-4">
            <Link href="/shop">Go to shop</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/shop/orders/${o.id}`}
              className="group flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {o.fulfillment_type === "shipping" ? <Truck className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary">
                    {o.order_reference}
                  </span>
                  <Badge variant={STATUS_META[o.status].variant}>
                    {STATUS_META[o.status].label}
                  </Badge>
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
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {formatMoney(o.total_amount, o.currency)}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
