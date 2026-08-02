"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Loader,
  Lock,
  Package,
  Store,
  Tag,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useShopCart } from "@/lib/shopCart"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { launchMpgsCheckout } from "@/lib/mpgsCheckout"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface OrganizerInfo {
  id: string
  business_name: string | null
  profile_image_url: string | null
  verified?: boolean
}

interface ShippingAddress {
  name: string
  phone: string
  line1: string
  line2: string
  city: string
  postal_code: string
  country: string
  notes: string
}

const emptyAddress: ShippingAddress = {
  name: "", phone: "", line1: "", line2: "", city: "", postal_code: "", country: "LK", notes: "",
}

function formatMoney(amount: number, currency = "LKR") {
  if (!Number.isFinite(amount)) return `${currency} —`
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CheckoutPage() {
  const router = useRouter()
  const params = useParams()
  const organizerId = typeof params?.organizerId === "string"
    ? params.organizerId
    : Array.isArray(params?.organizerId) ? params!.organizerId[0] : ""

  const { user, loading: authLoading } = useAuth()
  const { cart, subtotal, clear } = useShopCart(organizerId)
  const currency = cart[0]?.currency || "LKR"

  const [organizer, setOrganizer] = React.useState<OrganizerInfo | null>(null)
  const [fulfillmentType, setFulfillmentType] = React.useState<"shipping" | "pickup">(
    cart.some(c => c.fulfillment === "shipping") ? "shipping" : "pickup",
  )
  const [address, setAddress] = React.useState<ShippingAddress>(emptyAddress)
  const [pickupNote, setPickupNote] = React.useState("")
  const [phone, setPhone] = React.useState("")

  const [promoInput, setPromoInput] = React.useState("")
  const [promo, setPromo] = React.useState<{ code: string; type: "percentage" | "fixed"; amount: number } | null>(null)
  const [promoChecking, setPromoChecking] = React.useState(false)
  const [promoError, setPromoError] = React.useState("")

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")

  // Whether the cart's fulfillment mix actually supports each option.
  const supportsShipping = cart.every(c => c.fulfillment === "shipping" || c.fulfillment === "both")
  const supportsPickup   = cart.every(c => c.fulfillment === "pickup"   || c.fulfillment === "both")

  // Login + non-empty cart gate.
  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/shop/checkout/${organizerId}`)}`)
      return
    }
    if (cart.length === 0) {
      router.push("/shop/cart")
    }
  }, [authLoading, user, cart.length, organizerId, router])

  // Prefill buyer info from the user profile.
  React.useEffect(() => {
    if (user) {
      setAddress((a) => ({
        ...a,
        name: a.name || user.name || "",
        phone: a.phone || (user as { phone?: string }).phone || "",
      }))
      setPhone((p) => p || (user as { phone?: string }).phone || "")
    }
  }, [user])

  // Hydrate organizer brand.
  React.useEffect(() => {
    if (!organizerId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/shop/organizers/${organizerId}`)
        const data = await res.json()
        if (!cancelled && data?.success) setOrganizer(data.data?.organizer || null)
      } catch { /* not fatal */ }
    })()
    return () => { cancelled = true }
  }, [organizerId])

  // If the picked fulfillment is incompatible with the cart contents, switch.
  React.useEffect(() => {
    if (fulfillmentType === "shipping" && !supportsShipping) setFulfillmentType("pickup")
    if (fulfillmentType === "pickup"   && !supportsPickup)   setFulfillmentType("shipping")
  }, [fulfillmentType, supportsShipping, supportsPickup])

  const discountAmount = React.useMemo(() => promo?.amount ?? 0, [promo])
  const total = Math.max(0, subtotal - discountAmount)

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoChecking(true)
    setPromoError("")
    try {
      const qs = new URLSearchParams({
        organizerId,
        code,
        subtotal: String(subtotal),
      })
      const res = await fetch(`${API_URL}/api/shop/promo-codes/validate?${qs.toString()}`)
      const data = await res.json()
      if (data?.success && data.data?.valid) {
        const amount = data.data.discount?.amount ?? 0
        setPromo({
          code: data.data.promo_code.code,
          type: data.data.promo_code.discount_type,
          amount,
        })
      } else {
        setPromo(null)
        setPromoError(data?.data?.reason || data?.message || "Code not valid.")
      }
    } catch {
      setPromo(null)
      setPromoError("Network error.")
    } finally {
      setPromoChecking(false)
    }
  }

  const removePromo = () => {
    setPromo(null)
    setPromoInput("")
    setPromoError("")
  }

  // -------------------------------------------------------------------------
  // Submit: create order on server, then launch MPGS's Hosted Checkout
  // overlay. Mirrors event-payment hand-off.
  // -------------------------------------------------------------------------
  const submit = async () => {
    setError("")

    if (fulfillmentType === "shipping") {
      const required: (keyof ShippingAddress)[] = ["name", "phone", "line1", "city", "postal_code"]
      for (const f of required) {
        if (!address[f].trim()) {
          setError(`Please fill in shipping ${f.replace("_", " ")}.`)
          return
        }
      }
    } else {
      if (!phone.trim()) {
        setError("Please add a phone number for pickup contact.")
        return
      }
    }

    setSubmitting(true)
    try {
      // 1) Create the order. Server reserves stock + computes promo.
      const orderRes = await fetch(`${API_URL}/api/checkout/shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizer_id:      organizerId,
          fulfillment_type:  fulfillmentType,
          items:             cart.map(c => ({ product_id: c.product_id, quantity: c.quantity })),
          promo_code:        promo?.code ?? null,
          shipping_address:  fulfillmentType === "shipping" ? address : null,
          pickup_note:       fulfillmentType === "pickup" ? pickupNote.trim() : null,
          buyer_email:       user?.email ?? null,
          buyer_phone:       fulfillmentType === "shipping" ? address.phone : phone,
        }),
      })
      const orderData = await orderRes.json()
      if (!orderData?.success) {
        setError(orderData?.message || "Couldn't create the order.")
        setSubmitting(false)
        return
      }

      const order = orderData.data.order

      // 2) Initialize the MPGS payment for this order.
      const payRes = await fetch(`${API_URL}/api/payments/initialize-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: order.id }),
      })
      const payData = await payRes.json()
      if (!payData?.success) {
        setError(payData?.message || "Couldn't initialize payment.")
        setSubmitting(false)
        return
      }

      // 3) Launch MPGS's Hosted Checkout overlay. The user completes payment
      //    there and is returned to /api/payments/mpgs/return.
      // Clear local cart now so the user doesn't see stale items on return.
      // Server already holds the stock; even if the user aborts payment the
      // order's status will flip to Cancelled and stock releases.
      clear()
      await launchMpgsCheckout({
        sessionId: payData.data.sessionId,
        checkoutJsUrl: payData.data.checkoutJsUrl,
        onCancel: () => setSubmitting(false),
        onError: () => {
          setError("Payment failed. Please try again.")
          setSubmitting(false)
        },
      })
    } catch (err) {
      console.error("Shop checkout submit error:", err)
      setError("Network error. Please try again.")
      setSubmitting(false)
    }
  }

  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (cart.length === 0) return null

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/shop/cart"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to cart
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">Checkout</h1>

        {organizer && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4" />
            <span>Ordering from <span className="font-medium text-foreground">{organizer.business_name}</span></span>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Fulfillment
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <FulfillmentCard
                  icon={Truck}
                  label="Shipping"
                  description="Sent to your address"
                  selected={fulfillmentType === "shipping"}
                  disabled={!supportsShipping}
                  onClick={() => setFulfillmentType("shipping")}
                />
                <FulfillmentCard
                  icon={Package}
                  label="Event pickup"
                  description="Pick up from the organizer"
                  selected={fulfillmentType === "pickup"}
                  disabled={!supportsPickup}
                  onClick={() => setFulfillmentType("pickup")}
                />
              </div>
              {!supportsShipping && !supportsPickup && (
                <p className="mt-3 text-xs text-destructive">
                  This cart mixes products with incompatible fulfillment options. Edit the cart first.
                </p>
              )}
            </section>

            {fulfillmentType === "shipping" ? (
              <section className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Shipping address
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldText label="Full name" value={address.name} onChange={(v) => setAddress((a) => ({ ...a, name: v }))} />
                  <FieldText label="Phone"     value={address.phone} onChange={(v) => setAddress((a) => ({ ...a, phone: v }))} />
                </div>
                <FieldText label="Address line 1" value={address.line1} onChange={(v) => setAddress((a) => ({ ...a, line1: v }))} />
                <FieldText label="Address line 2 (optional)" value={address.line2} onChange={(v) => setAddress((a) => ({ ...a, line2: v }))} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <FieldText label="City"        value={address.city}        onChange={(v) => setAddress((a) => ({ ...a, city: v }))} />
                  <FieldText label="Postal code" value={address.postal_code} onChange={(v) => setAddress((a) => ({ ...a, postal_code: v }))} />
                  <FieldText label="Country"     value={address.country}     onChange={(v) => setAddress((a) => ({ ...a, country: v }))} />
                </div>
                <FieldText label="Delivery notes (optional)" value={address.notes} onChange={(v) => setAddress((a) => ({ ...a, notes: v }))} />
              </section>
            ) : (
              <section className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Pickup contact
                </h2>
                <FieldText label="Phone" value={phone} onChange={setPhone} />
                <FieldText label="Pickup note (optional)" value={pickupNote} onChange={setPickupNote} placeholder="Preferred pickup time, who'll be collecting..." />
                <p className="text-xs text-muted-foreground">
                  The organizer will send pickup details once your payment clears.
                </p>
              </section>
            )}
          </div>

          {/* Order summary */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 space-y-3 rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Order summary
              </h2>

              <ul className="space-y-2 text-sm">
                {cart.map(c => (
                  <li key={c.product_id} className="flex items-start gap-2">
                    <span className="text-muted-foreground">{c.quantity}×</span>
                    <span className="flex-1 line-clamp-2 text-foreground">{c.title}</span>
                    <span className="text-foreground">{formatMoney(c.unit_price * c.quantity, c.currency)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <Row label="Subtotal" value={formatMoney(subtotal, currency)} />
                {promo && (
                  <Row
                    label={
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" /> {promo.code}
                      </span>
                    }
                    value={`-${formatMoney(discountAmount, currency)}`}
                    valueClass="text-success"
                  />
                )}
                <Row label={<span className="font-semibold">Total</span>} value={<span className="font-semibold">{formatMoney(total, currency)}</span>} />
              </div>

              {/* Promo code apply */}
              <div className="rounded-lg border border-border bg-background p-3">
                {promo ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      {promo.code} applied
                    </span>
                    <button
                      type="button"
                      onClick={removePromo}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="Promo code"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={applyPromo}
                      disabled={!promoInput.trim() || promoChecking}
                    >
                      {promoChecking ? <Loader className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {promoError && <p className="mt-1.5 text-[10px] text-destructive">{promoError}</p>}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={submit}
                disabled={submitting || (!supportsShipping && !supportsPickup)}
                className="w-full"
              >
                {submitting ? (
                  <><Loader className="mr-2 h-4 w-4 animate-spin" /> Redirecting...</>
                ) : (
                  <><CreditCard className="mr-2 h-4 w-4" /> Pay {formatMoney(total, currency)}</>
                )}
              </Button>

              <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                Secure payment via Seylan MPGS
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function FieldText({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function Row({
  label, value, valueClass,
}: { label: React.ReactNode; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-foreground", valueClass)}>{value}</span>
    </div>
  )
}

function FulfillmentCard({
  icon: Icon, label, description, selected, disabled, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:bg-muted",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  )
}
