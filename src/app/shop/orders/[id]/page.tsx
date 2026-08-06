"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CreditCard,
  ImageIcon,
  Loader,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  XCircle,
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
  // Enriched at GET time for pickup orders. Null on shipping orders or when
  // the product no longer has a pickup_location. For event_product items the
  // backend fills these with the linked event's venue info.
  pickup_location?: string | null
  pickup_location_url?: string | null
  pickup_event?: { id: string; title: string; venue_name?: string | null } | null
}

interface OrganizerInfo {
  id: string
  business_name: string | null
  profile_image_url: string | null
  phone?: string | null
  verified?: boolean
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
  organizer_id: string
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

const FULFILLMENT_STEPS: Array<{ key: FulfillmentStatus; label: string; forType: Array<"shipping" | "pickup"> }> = [
  { key: "pending",    label: "Order received", forType: ["shipping", "pickup"] },
  { key: "preparing",  label: "Preparing",      forType: ["shipping", "pickup"] },
  { key: "shipped",    label: "Shipped",        forType: ["shipping"] },
  { key: "delivered",  label: "Delivered",      forType: ["shipping"] },
  { key: "picked_up",  label: "Picked up",      forType: ["pickup"] },
]

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return iso
  }
}

// useSearchParams() needs a Suspense boundary in Next 16 or the build bails.
// We wrap the inner component so static prerender keeps working.
export default function OrderDetailPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Loader className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
      <OrderDetailInner />
    </React.Suspense>
  )
}

function OrderDetailInner() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params!.id[0] : ""
  const paymentResult = searchParams.get("payment") // 'success' | 'cancelled' | 'failed'

  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = React.useState<Order | null>(null)
  const [items, setItems] = React.useState<OrderItem[]>([])
  const [organizer, setOrganizer] = React.useState<OrganizerInfo | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [payInFlight, setPayInFlight] = React.useState(false)

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/shop/orders/${id}`)}`)
    }
  }, [authLoading, user, router, id])

  const load = React.useCallback(async () => {
    if (!id || !user) return
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/shop/orders/${id}`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setOrder(data.data?.order)
        setItems(data.data?.items ?? [])
        setOrganizer(data.data?.organizer || null)
      } else {
        setError(data?.message || "Couldn't load order.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }, [id, user])

  React.useEffect(() => { load() }, [load])

  const retryPayment = async () => {
    if (!order) return
    setPayInFlight(true)
    try {
      const res = await fetch(`${API_URL}/api/payments/initialize-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.message || "Couldn't initialize payment.")
        setPayInFlight(false)
        return
      }
      const form = document.createElement("form")
      form.method = "POST"
      form.action = data.data.checkoutUrl
      for (const [key, val] of Object.entries(data.data.paymentData as Record<string, string>)) {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = key
        input.value = String(val)
        form.appendChild(input)
      }
      document.body.appendChild(form)
      form.submit()
    } catch {
      toast.error("Network error.")
      setPayInFlight(false)
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
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold text-foreground">{error || "Order not found"}</h1>
        <Button asChild className="mt-4">
          <Link href="/shop/orders">Back to orders</Link>
        </Button>
      </div>
    )
  }

  const meta = STATUS_META[order.status]
  const visibleSteps = FULFILLMENT_STEPS.filter(s => s.forType.includes(order.fulfillment_type))
  const currentIdx = visibleSteps.findIndex(s => s.key === order.fulfillment_status)

  return (
    <div className="space-y-6">
      <Link
        href="/shop/orders"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to orders
      </Link>

        {paymentResult === "success" && order.status === "Confirmed" && (
          <div className="mt-4 flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <span>Payment received. The organizer has been notified and will start preparing your order.</span>
          </div>
        )}
        {(paymentResult === "cancelled" || paymentResult === "failed") && order.status !== "Confirmed" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="mt-0.5 h-4 w-4" />
            <span>Payment didn't complete. You can try again below — stock will be re-reserved.</span>
          </div>
        )}

        <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
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

          {order.status === "Pending" && order.payment_status !== "Completed" && (
            <Button onClick={retryPayment} disabled={payInFlight}>
              {payInFlight
                ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> Redirecting...</>
                : <><CreditCard className="mr-2 h-4 w-4" /> Complete payment</>}
            </Button>
          )}
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
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
                                Open in maps <ArrowLeft className="h-2.5 w-2.5 rotate-180" />
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
