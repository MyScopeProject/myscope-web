"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Loader,
  Package,
  Receipt,
  Truck,
  User,
} from "lucide-react"
import { useOrganizerGuard } from "@/hooks/useOrganizerGuard"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
  buyer_email: string | null
  shipping_address: { name?: string } | null
  created_at: string
}

interface ProductLite {
  id: string
  title: string
}

const STATUS_META: Record<OrderStatus, { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }> = {
  Pending:   { label: "Awaiting payment", variant: "warning" },
  Confirmed: { label: "Paid",             variant: "success" },
  Cancelled: { label: "Cancelled",        variant: "outline" },
  Refunded:  { label: "Refunded",         variant: "destructive" },
}

const FULFILLMENT_META: Record<FulfillmentStatus, { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }> = {
  pending:    { label: "New",             variant: "warning" },
  preparing:  { label: "Preparing",       variant: "warning" },
  shipped:    { label: "Shipped",         variant: "success" },
  delivered:  { label: "Delivered",       variant: "success" },
  picked_up:  { label: "Picked up",       variant: "success" },
  returned:   { label: "Returned",        variant: "destructive" },
}

// "Open" and "Awaiting payment" are deliberately not offered here — this is
// a per-product drill-down, not the operational triage queue. Organizers use
// this view to check a product's order history and revenue, not to chase
// unpaid carts.
type Filter = "all" | OrderStatus

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all",       label: "All" },
  { value: "Confirmed", label: "Paid" },
  { value: "Cancelled", label: "Cancelled" },
]

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

export default function OrganizerProductOrdersPage() {
  const params = useParams()
  const productId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params!.id[0] : ""
  const { user, loading: authLoading } = useOrganizerGuard(`/organizer/shop/${productId}/orders`)
  const [product, setProduct] = React.useState<ProductLite | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [search, setSearch] = React.useState("")

  const fetchData = React.useCallback(async () => {
    if (!productId) return
    try {
      setLoading(true)
      setError("")
      const [productRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/api/organizer/shop/${productId}`, { credentials: "include" }),
        fetch(`${API_URL}/api/organizer/shop/orders?product_id=${productId}`, { credentials: "include" }),
      ])
      const productData = await productRes.json()
      const ordersData = await ordersRes.json()
      if (productData?.success) {
        setProduct(productData.data?.product ?? null)
      }
      if (ordersData?.success) {
        setOrders(ordersData.data?.orders ?? [])
      } else {
        setError(ordersData?.message || "Couldn't load orders.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }, [productId])

  React.useEffect(() => {
    if (user && ["organizer", "superadmin"].includes(user.role || "")) {
      fetchData()
    }
  }, [user, fetchData])

  const filtered = React.useMemo(() => {
    let result = orders
    if (filter !== "all") {
      result = result.filter(o => o.status === filter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(o =>
        o.order_reference.toLowerCase().includes(q) ||
        o.buyer_email?.toLowerCase().includes(q) ||
        o.shipping_address?.name?.toLowerCase().includes(q),
      )
    }
    return result
  }, [orders, filter, search])

  const counts = React.useMemo(() => {
    const c: Record<Filter, number> = {
      all: orders.length,
      Pending: orders.filter(o => o.status === "Pending").length,
      Confirmed: orders.filter(o => o.status === "Confirmed").length,
      Cancelled: orders.filter(o => o.status === "Cancelled").length,
      Refunded: orders.filter(o => o.status === "Refunded").length,
    }
    return c
  }, [orders])

  const revenue = React.useMemo(
    () => orders
      .filter(o => o.status === "Confirmed")
      .reduce((sum, o) => sum + (typeof o.total_amount === "number" ? o.total_amount : Number(o.total_amount) || 0), 0),
    [orders],
  )

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/organizer/shop/orders"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to orders
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Receipt className="h-6 w-6 text-primary" />
            {product?.title ?? "Product orders"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders for this product. Update fulfillment status from an individual order.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Current revenue</div>
          <div className="text-lg font-semibold text-foreground">{formatMoney(revenue)}</div>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order, buyer name or email..."
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] text-muted-foreground">({counts[f.value]})</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            {orders.length === 0 ? "No orders yet" : "Nothing matches that filter"}
          </h2>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <Link
              key={o.id}
              href={`/organizer/shop/orders/${o.id}`}
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
                  {o.shipping_address?.name && (
                    <>
                      <span>·</span>
                      <User className="h-3 w-3" />
                      <span>{o.shipping_address.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-foreground">
                  {formatMoney(o.total_amount, o.currency)}
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
