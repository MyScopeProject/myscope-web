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
  Loader,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatDate,
  OrderMainDetails,
  OrderSidebar,
  STATUS_META,
  type OrderDetail as Order,
  type OrganizerInfo,
  type OrderItem,
} from "@/components/shop/order-detail-content"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

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
            <span>Payment didn&apos;t complete. You can try again below — stock will be re-reserved.</span>
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
          <div className="lg:col-span-2">
            <OrderMainDetails order={order} items={items} />
          </div>
          <aside className="lg:col-span-1">
            <OrderSidebar order={order} organizer={organizer} />
          </aside>
        </div>
    </div>
  )
}
