"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ImageIcon,
  Loader,
  Mail,
  MapPin,
  Package,
  Phone,
  Receipt,
  Truck,
  User as UserIcon,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type OrderStatus = "Pending" | "Confirmed" | "Cancelled" | "Refunded"
type FulfillmentStatus = "pending" | "preparing" | "shipped" | "delivered" | "picked_up" | "returned"

interface OrderItem {
  id: string
  product_id: string
  title_snapshot: string
  image_snapshot: string | null
  unit_price: number | string
  quantity: number
  line_total: number | string
}

interface Order {
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
  cancelled_at: string | null
  fulfilled_at: string | null
  created_at: string
}

const STATUS_META: Record<OrderStatus, { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }> = {
  Pending:   { label: "Awaiting payment", variant: "warning" },
  Confirmed: { label: "Paid",             variant: "success" },
  Cancelled: { label: "Cancelled",        variant: "outline" },
  Refunded:  { label: "Refunded",         variant: "destructive" },
}

const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  pending:    "Order received",
  preparing:  "Preparing",
  shipped:    "Shipped",
  delivered:  "Delivered",
  picked_up:  "Picked up",
  returned:   "Returned",
}

// Allowed next statuses per current status; mirrors the backend transitions
// table so the buttons match what the API accepts.
const TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  pending:    ["preparing", "shipped", "picked_up", "returned"],
  preparing:  ["shipped", "picked_up", "returned"],
  shipped:    ["delivered", "returned"],
  delivered:  ["returned"],
  picked_up:  ["returned"],
  returned:   [],
}

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return iso
  }
}

export default function OrganizerOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params!.id[0] : ""

  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = React.useState<Order | null>(null)
  const [items, setItems] = React.useState<OrderItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [updating, setUpdating] = React.useState(false)

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=/organizer/shop/orders/${id}`)
      return
    }
    if (!["organizer", "superadmin"].includes(user.role || "")) {
      router.push("/become-organizer")
    }
  }, [authLoading, user, router, id])

  const load = React.useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/organizer/shop/orders/${id}`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setOrder(data.data?.order)
        setItems(data.data?.items ?? [])
      } else {
        setError(data?.message || "Couldn't load order.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => { load() }, [load])

  const updateFulfillment = async (next: FulfillmentStatus) => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/orders/${order.id}/fulfillment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fulfillment_status: next }),
      })
      const data = await res.json()
      if (data?.success) {
        setOrder(data.data?.order)
      } else {
        alert(data?.message || "Update failed.")
      }
    } catch {
      alert("Network error.")
    } finally {
      setUpdating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {error || "Order not found."}
        <div className="mt-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/organizer/shop/orders">Back to orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  const meta = STATUS_META[order.status]
  const nextStatuses = TRANSITIONS[order.fulfillment_status] || []

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
          <div className="flex flex-wrap items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              {order.order_reference}
            </h1>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Placed {formatDate(order.created_at)}</span>
            <span>·</span>
            <span className="capitalize">{order.fulfillment_type}</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Fulfillment controls (only when paid) */}
          {order.status === "Confirmed" && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Fulfillment
              </h2>
              <div className="mt-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Current: {FULFILLMENT_LABEL[order.fulfillment_status]}
                </span>
                {order.fulfilled_at && (
                  <span className="text-xs text-muted-foreground">
                    · since {formatDate(order.fulfilled_at)}
                  </span>
                )}
              </div>

              {nextStatuses.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">Move to:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nextStatuses.map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant={next === "returned" ? "outline" : "default"}
                        disabled={updating}
                        onClick={() => updateFulfillment(next)}
                      >
                        {FULFILLMENT_LABEL[next]}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No further transitions available.</p>
              )}
            </section>
          )}

          {/* Items */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Items
            </h2>
            <ul className="mt-3 divide-y divide-border">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-3">
                  <Link
                    href={`/organizer/shop/${it.product_id}`}
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
                      href={`/organizer/shop/${it.product_id}`}
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
                </li>
              ))}
            </ul>
          </section>

          {/* Address / pickup info */}
          {order.fulfillment_type === "shipping" && order.shipping_address && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Truck className="h-4 w-4" />
                Ship to
              </h2>
              <div className="mt-2 text-sm text-foreground">
                <p className="font-medium">{order.shipping_address.name}</p>
                <p className="text-muted-foreground">{order.shipping_address.phone}</p>
                <p className="mt-2 whitespace-pre-line">
                  {[order.shipping_address.line1, order.shipping_address.line2, order.shipping_address.city, order.shipping_address.postal_code, order.shipping_address.country]
                    .filter(Boolean).join("\n")}
                </p>
                {order.shipping_address.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">Notes: {order.shipping_address.notes}</p>
                )}
              </div>
            </section>
          )}
          {order.fulfillment_type === "pickup" && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="h-4 w-4" />
                Pickup
              </h2>
              {order.pickup_note ? (
                <p className="mt-2 text-sm text-foreground">Buyer's note: {order.pickup_note}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No pickup note.</p>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:col-span-1">
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
              <Row label={<span className="font-semibold">Total paid</span>}
                   value={<span className="font-semibold">{formatMoney(order.total_amount, order.currency)}</span>} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Buyer
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {order.shipping_address?.name && (
                <li className="flex items-center gap-2 text-foreground">
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {order.shipping_address.name}
                </li>
              )}
              {order.buyer_email && (
                <li className="flex items-center gap-2 text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a className="hover:underline" href={`mailto:${order.buyer_email}`}>
                    {order.buyer_email}
                  </a>
                </li>
              )}
              {(order.buyer_phone || order.shipping_address?.phone) && (
                <li className="flex items-center gap-2 text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a className="hover:underline" href={`tel:${order.buyer_phone || order.shipping_address?.phone}`}>
                    {order.buyer_phone || order.shipping_address?.phone}
                  </a>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>
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
