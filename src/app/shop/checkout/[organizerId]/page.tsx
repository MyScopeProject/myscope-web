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
import { launchKokoCheckout } from "@/lib/kokoCheckout"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
// Same flag the event checkout page gates Koko behind — one env var controls
// Koko availability across both checkout flows.
const KOKO_ENABLED = process.env.NEXT_PUBLIC_KOKO_ENABLED === "true"

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
  notes: string
}

// MyScope only operates in Sri Lanka — country isn't collected from the
// user, but the backend/email templates still accept it for display.
const SHIPPING_COUNTRY = "Sri Lanka"

const emptyAddress: ShippingAddress = {
  name: "", phone: "", line1: "", line2: "", city: "", postal_code: "", notes: "",
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
  const [promo, setPromo] = React.useState<{ code: string; type: "percentage" | "fixed"; amount: number; product_id: string | null } | null>(null)
  const [promoChecking, setPromoChecking] = React.useState(false)
  const [promoError, setPromoError] = React.useState("")

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")

  // 'card' → MPGS; 'koko' → Koko BNPL (only user-selectable when KOKO_ENABLED).
  const [paymentMethod, setPaymentMethod] = React.useState<"card" | "koko">("card")

  // Customer-visible convenience fee %. Same public endpoint the event
  // checkout page reads from — fetched once so an admin rate change
  // propagates without a redeploy. Default to 0.02 (2%) so we don't render a
  // zero fee before the call resolves. The backend recomputes the real fee
  // (and which products it applies to) at order-create time — this is a
  // display estimate only.
  const [convenienceFeePct, setConvenienceFeePct] = React.useState(0.02)
  React.useEffect(() => {
    let cancelled = false
    fetch(`${API_URL}/api/settings/fees`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return
        const pct = Number(body?.data?.convenience_fee_pct)
        if (Number.isFinite(pct) && pct >= 0) setConvenienceFeePct(pct)
      })
      .catch(() => {
        // soft-fail: keep the 0.02 default
      })
    return () => { cancelled = true }
  }, [])

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

  // Convenience fee — mirrors the mixed-cart math in
  // myscope-api routes/shopCheckout.js exactly: only fee-enabled line items
  // contribute to the fee base, and the discount is attributed to the
  // fee-eligible portion the same way it was actually applied (product-
  // scoped promo hits one line; storefront-wide promo prorates across the
  // whole cart). This is a display estimate — the server recomputes and is
  // authoritative for what's actually charged.
  const feeEligibleSubtotal = React.useMemo(
    () => cart
      .filter((c) => c.convenience_fee_enabled !== false)
      .reduce((sum, c) => sum + c.unit_price * c.quantity, 0),
    [cart],
  )
  const feeEligibleDiscount = React.useMemo(() => {
    if (discountAmount <= 0) return 0
    if (promo?.product_id) {
      const line = cart.find((c) => c.product_id === promo.product_id)
      return line && line.convenience_fee_enabled !== false ? discountAmount : 0
    }
    if (subtotal <= 0) return 0
    return +(discountAmount * (feeEligibleSubtotal / subtotal)).toFixed(2)
  }, [cart, discountAmount, feeEligibleSubtotal, promo, subtotal])
  const feeBase = Math.max(0, feeEligibleSubtotal - feeEligibleDiscount)
  const convenienceFee = +(feeBase * convenienceFeePct).toFixed(2)

  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount)

  // Koko re-prices the order: paying with Koko drops the convenience fee and
  // adds a 20% surcharge on the (post-discount) subtotal instead (kept in
  // sync with the backend's KOKO_SURCHARGE_PCT / computeKokoAmounts). The
  // buyer's total is then split by Koko into 3 equal installments.
  const KOKO_SURCHARGE_PCT = 0.2
  // Global feature flag AND every cart item's admin-controlled per-product
  // override — a cart with even one koko_enabled=false item can't use Koko
  // at all (server-side initializeShopOrderKoko re-checks the live flags on
  // ALL items and blocks the whole order the same way).
  const kokoAvailable = KOKO_ENABLED && cart.every((c) => c.koko_enabled !== false)
  const isKoko = kokoAvailable && paymentMethod === "koko"
  const kokoSurcharge = +(subtotalAfterDiscount * KOKO_SURCHARGE_PCT).toFixed(2)
  const total = isKoko
    ? subtotalAfterDiscount + kokoSurcharge
    : subtotalAfterDiscount + convenienceFee

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
          product_id: data.data.promo_code.product_id ?? null,
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
          shipping_address:  fulfillmentType === "shipping" ? { ...address, country: SHIPPING_COUNTRY } : null,
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

      // 2) Initialize payment for this order with the chosen gateway.
      if (isKoko) {
        const kokoRes = await fetch(`${API_URL}/api/payments/initialize-shop-koko`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId: order.id }),
        })
        const kokoData = await kokoRes.json()
        if (!kokoData?.success) {
          setError(kokoData?.message || "Couldn't initialize payment.")
          setSubmitting(false)
          return
        }
        // Clear local cart now so the user doesn't see stale items on
        // return. Server already holds the stock; even if the buyer aborts
        // on Koko's page the order stays Pending and the stale-order sweep
        // releases it.
        clear()
        // Full-page form POST to Koko; the verdict returns via the signed
        // webhook, never from this redirect.
        launchKokoCheckout({ actionUrl: kokoData.data.actionUrl, fields: kokoData.data.fields })
        return
      }

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

      // 3) Launch MPGS's Hosted Checkout. showPaymentPage() redirects the
      //    whole browser to MPGS; MPGS redirects back to returnUrl (set
      //    server-side) regardless of outcome — success/cancel/decline are
      //    all told apart server-side via retrieveOrder().
      // Clear local cart now so the user doesn't see stale items on return.
      // Server already holds the stock; even if the user aborts payment the
      // order's status will flip to Cancelled and stock releases.
      clear()
      await launchMpgsCheckout({
        sessionId: payData.data.sessionId,
        checkoutJsUrl: payData.data.checkoutJsUrl,
        // These fire only for a pre-redirect failure (bad session, SDK
        // config error) — we're still on this page then.
        onCancel: () => setSubmitting(false),
        onError: (err) => {
          console.error("MPGS checkout error:", err)
          setError("Payment failed. Please try again.")
          setSubmitting(false)
        },
      })
    } catch (err) {
      console.error("Shop checkout submit error:", err)
      setError("Payment failed. Please try again.")
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldText label="City"        value={address.city}        onChange={(v) => setAddress((a) => ({ ...a, city: v }))} />
                  <FieldText label="Postal code" value={address.postal_code} onChange={(v) => setAddress((a) => ({ ...a, postal_code: v }))} />
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
                {/* Convenience fee is surfaced only for CARD. Koko hides it
                    (and the Total) — the summary shows just the Koko 1st
                    installment below instead. */}
                {!isKoko && convenienceFee > 0 && (
                  <Row
                    label={`Convenience Fee (${(convenienceFeePct * 100).toFixed(convenienceFeePct * 100 % 1 === 0 ? 0 : 1)}%)`}
                    value={`+ ${formatMoney(convenienceFee, currency)}`}
                  />
                )}
                {!isKoko && (
                  <Row label={<span className="font-semibold">Total</span>} value={<span className="font-semibold">{formatMoney(total, currency)}</span>} />
                )}
              </div>

              {/* Koko: show ONLY the first installment (with logo) — no
                  surcharge line, no Total. */}
              {isKoko && (
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/Images/koko.png" alt="KOKO" className="h-5 w-auto object-contain" />
                      <span className="text-sm text-muted-foreground">1st installment</span>
                    </div>
                    <span className="text-2xl font-bold text-foreground">{formatMoney(total / 3, currency)}</span>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground">Payment Method</p>
                <label className="flex cursor-pointer items-start gap-2.5 px-1 py-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Images/payment.jpeg" alt="Card, Wallets & Banking" className="h-6 w-auto rounded object-contain" />
                    <span className="mt-1 block text-xs text-muted-foreground">Visa, Mastercard </span>
                  </span>
                </label>
                {kokoAvailable && (
                  <label className="flex cursor-pointer items-start gap-2.5 px-1 py-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="koko"
                      checked={paymentMethod === "koko"}
                      onChange={() => setPaymentMethod("koko")}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/Images/koko.png" alt="KOKO" className="h-5 w-auto object-contain" />
                      <span className="mt-1 block text-xs text-muted-foreground">Buy Now, Pay Later</span>
                    </span>
                  </label>
                )}
              </div>

              {/* Promo code apply */}
              <div className="rounded-lg border border-border bg-transparent p-3">
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
                  <><CreditCard className="mr-2 h-4 w-4" /> Pay {formatMoney(isKoko ? total / 3 : total, currency)}</>
                )}
              </Button>

              <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                {isKoko ? "Buy Now, Pay Later via KOKO" : "Secure payment via Seylan MPGS"}
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
          : "border-border bg-transparent hover:bg-muted/50",
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
