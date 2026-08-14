"use client"

import * as React from "react"

// Per-organizer cart, persisted in localStorage. One cart per organizer so
// every order maps cleanly to one organizer's payout. Switching organizers
// keeps both carts separately so a buyer can stage purchases across stores.
//
// Storage shape (localStorage key "myscope:shop-carts:v1"):
//   { [organizerId: string]: CartItem[] }
//
// CartItem snapshots title/image/price at add-time so the cart row renders
// even after the buyer's product page closes. The server re-validates prices
// at checkout, so this snapshot is purely for UI.

const STORAGE_KEY = "myscope:shop-carts:v1"
const STORAGE_VERSION = 1

export interface CartItem {
  product_id: string
  organizer_id: string
  title: string
  image: string | null
  unit_price: number
  currency: string
  quantity: number
  fulfillment: "shipping" | "pickup" | "both"
  // Whether this item can ship — set from product.fulfillment so the cart
  // page can warn before checkout when mixing pickup-only + shipping items.
  // Snapshot of the admin-controlled convenience-fee toggle at add-time —
  // purely for the checkout summary's fee estimate. The server is
  // authoritative: it re-reads the product's live flag at order-create time,
  // so a stale snapshot here (admin flips it after the item was added) never
  // affects what's actually charged, only the pre-payment preview.
  convenience_fee_enabled: boolean
  // Snapshot of the admin-controlled Koko (BNPL) toggle at add-time, same
  // caveats as convenience_fee_enabled above — UI-only, server re-reads the
  // live flag (across ALL items) at Koko payment-initialize time.
  koko_enabled: boolean
  added_at: number
}

type Carts = Record<string, CartItem[]>

interface CartStore {
  carts: Carts
  setCarts: (next: Carts) => void
  version: number
}

const CartContext = React.createContext<CartStore | null>(null)

function readFromStorage(): Carts {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}
    if (parsed.version !== STORAGE_VERSION) return {}
    return (parsed.carts as Carts) || {}
  } catch {
    return {}
  }
}

function writeToStorage(carts: Carts) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, carts }),
    )
  } catch { /* quota or private-mode — silent */ }
}

export function ShopCartProvider({ children }: { children: React.ReactNode }) {
  const [carts, setCartsState] = React.useState<Carts>({})
  const [version, setVersion]  = React.useState(0)

  // Hydrate from localStorage once on mount. Server-rendered initial state
  // is empty so SSR + first client render match.
  React.useEffect(() => {
    setCartsState(readFromStorage())
    setVersion((v) => v + 1)
  }, [])

  // Cross-tab sync — if the user opens a second tab and edits the cart, this
  // tab picks up the change next render.
  React.useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      setCartsState(readFromStorage())
      setVersion((v) => v + 1)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setCarts = React.useCallback((next: Carts) => {
    setCartsState(next)
    setVersion((v) => v + 1)
    writeToStorage(next)
  }, [])

  const value = React.useMemo(() => ({ carts, setCarts, version }), [carts, setCarts, version])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

function useStore(): CartStore {
  const ctx = React.useContext(CartContext)
  if (!ctx) {
    throw new Error("useShopCart must be used inside ShopCartProvider")
  }
  return ctx
}

/**
 * Hook returning all carts and primitives to mutate them. Components should
 * usually prefer the more targeted hooks below.
 */
export function useShopCarts() {
  const store = useStore()
  return store.carts
}

/**
 * Hook returning the cart for a single organizer + mutation helpers.
 *
 * Adding an item with the same product_id increments quantity; pass replace=true
 * to overwrite (used on the cart page when the user types a quantity).
 */
export function useShopCart(organizerId: string | null | undefined) {
  const { carts, setCarts } = useStore()
  const cart = organizerId ? (carts[organizerId] || []) : []

  const setCart = React.useCallback((nextItems: CartItem[]) => {
    if (!organizerId) return
    const next = { ...carts }
    if (nextItems.length === 0) {
      delete next[organizerId]
    } else {
      next[organizerId] = nextItems
    }
    setCarts(next)
  }, [carts, organizerId, setCarts])

  const add = React.useCallback((item: Omit<CartItem, "added_at"> & { quantity?: number }, options?: { replace?: boolean }) => {
    if (!organizerId) return
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1
    const existing = cart.find(c => c.product_id === item.product_id)
    let next: CartItem[]
    if (existing) {
      next = cart.map(c => c.product_id === item.product_id
        ? { ...c, quantity: options?.replace ? qty : c.quantity + qty }
        : c,
      )
    } else {
      next = [...cart, { ...item, quantity: qty, added_at: Date.now() }]
    }
    setCart(next)
  }, [cart, organizerId, setCart])

  const remove = React.useCallback((productId: string) => {
    setCart(cart.filter(c => c.product_id !== productId))
  }, [cart, setCart])

  const setQuantity = React.useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(c => c.product_id !== productId))
      return
    }
    setCart(cart.map(c => c.product_id === productId ? { ...c, quantity } : c))
  }, [cart, setCart])

  const clear = React.useCallback(() => setCart([]), [setCart])

  const subtotal = cart.reduce((sum, c) => sum + c.unit_price * c.quantity, 0)
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  return { cart, add, remove, setQuantity, clear, subtotal, itemCount }
}

/**
 * Returns the total item count across all organizer carts. Used by the
 * navbar badge.
 */
export function useCartBadgeCount() {
  const { carts } = useStore()
  return Object.values(carts).reduce(
    (sum, items) => sum + items.reduce((s, c) => s + c.quantity, 0),
    0,
  )
}
