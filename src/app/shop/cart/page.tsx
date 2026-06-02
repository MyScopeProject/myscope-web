"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  ImageIcon,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useShopCarts, useShopCart, type CartItem } from "@/lib/shopCart"
import { useAuth } from "@/context/AuthContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

function formatMoney(amount: number, currency = "LKR") {
  if (!Number.isFinite(amount)) return `${currency} —`
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface OrganizerInfo {
  id: string
  business_name: string | null
  profile_image_url: string | null
  verified?: boolean
}

export default function CartPage() {
  const carts = useShopCarts()
  const organizerIds = Object.keys(carts).filter(id => (carts[id]?.length ?? 0) > 0)
  const [orgInfo, setOrgInfo] = React.useState<Record<string, OrganizerInfo>>({})

  // Hydrate organizer brand info so each cart shows a name + avatar.
  React.useEffect(() => {
    if (organizerIds.length === 0) return
    let cancelled = false
    Promise.all(organizerIds.map(async (id) => {
      try {
        const res = await fetch(`${API_URL}/api/shop/organizers/${id}`)
        const data = await res.json()
        if (data?.success && data.data?.organizer) {
          return [id, data.data.organizer as OrganizerInfo] as const
        }
      } catch { /* fall through */ }
      return null
    })).then((results) => {
      if (cancelled) return
      const map: Record<string, OrganizerInfo> = {}
      for (const r of results) if (r) map[r[0]] = r[1]
      setOrgInfo(map)
    })
    return () => { cancelled = true }
  }, [organizerIds.join(",")])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
            <ShoppingBag className="h-7 w-7 text-primary" />
            Your cart
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Carts are kept separate per organizer so each checkout flows directly to that storefront.
          </p>
        </header>

        {organizerIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Your cart is empty</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Browse the shop and add a product to get started.
            </p>
            <Button asChild className="mt-4">
              <Link href="/shop">Go to shop</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {organizerIds.map((id) => (
              <OrganizerCart key={id} organizerId={id} organizer={orgInfo[id]} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function OrganizerCart({ organizerId, organizer }: { organizerId: string; organizer?: OrganizerInfo }) {
  const { cart, remove, setQuantity, subtotal } = useShopCart(organizerId)
  const { user } = useAuth()

  const currency = cart[0]?.currency || "LKR"

  // If the cart mixes pickup-only + shipping-only products, the buyer can't
  // pick a single fulfillment_type. We surface that here so they fix it before
  // checkout.
  const onlyShipping = cart.every(c => c.fulfillment === "shipping")
  const onlyPickup   = cart.every(c => c.fulfillment === "pickup")
  const allowBoth    = cart.every(c => c.fulfillment === "shipping" || c.fulfillment === "both")
  const pickupOk     = cart.every(c => c.fulfillment === "pickup"   || c.fulfillment === "both")

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
        {organizer?.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organizer.profile_image_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Store className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/shop?organizerId=${organizerId}`}
            className="block truncate text-sm font-semibold text-foreground hover:text-primary"
          >
            {organizer?.business_name || "Organizer"}
          </Link>
        </div>
      </header>

      <ul className="divide-y divide-border">
        {cart.map((item) => (
          <CartLine
            key={item.product_id}
            item={item}
            onRemove={() => remove(item.product_id)}
            onSetQuantity={(q) => setQuantity(item.product_id, q)}
          />
        ))}
      </ul>

      <footer className="border-t border-border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold text-foreground">{formatMoney(subtotal, currency)}</span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Discounts (if any) apply at checkout. Shipping & taxes shown next step.
        </p>

        {!allowBoth && !pickupOk && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            This cart has pickup-only and shipping-only products mixed together. Remove one type
            before checking out.
          </div>
        )}

        {!user && (
          <p className="mt-3 text-xs text-muted-foreground">
            You'll need to sign in before checkout.
          </p>
        )}

        <Button asChild className="mt-3 w-full" disabled={!allowBoth && !pickupOk}>
          <Link
            href={user
              ? `/shop/checkout/${organizerId}`
              : `/auth/login?redirect=${encodeURIComponent(`/shop/checkout/${organizerId}`)}`}
            className="inline-flex items-center justify-center gap-2"
          >
            Checkout — {formatMoney(subtotal, currency)}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </footer>
    </section>
  )
}

function CartLine({
  item, onRemove, onSetQuantity,
}: {
  item: CartItem
  onRemove: () => void
  onSetQuantity: (qty: number) => void
}) {
  return (
    <li className="flex items-center gap-3 p-4">
      <Link
        href={`/shop/${item.product_id}`}
        className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-full w-full p-4 text-muted-foreground" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/shop/${item.product_id}`}
          className="block truncate text-sm font-medium text-foreground hover:text-primary"
        >
          {item.title}
        </Link>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatMoney(item.unit_price, item.currency)} each
        </div>

        <div className="mt-2 inline-flex items-center overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => onSetQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="p-1.5 text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="min-w-[2ch] px-2 text-center text-xs font-medium text-foreground">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onSetQuantity(item.quantity + 1)}
            className="p-1.5 text-foreground transition-colors hover:bg-muted"
            aria-label="Increase quantity"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-semibold text-foreground">
          {formatMoney(item.unit_price * item.quantity, item.currency)}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Remove
        </button>
      </div>
    </li>
  )
}
