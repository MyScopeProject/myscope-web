"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  Loader,
  Receipt,
} from "lucide-react"
import { useOrganizerGuard } from "@/hooks/useOrganizerGuard"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type ProductStatus = "draft" | "pending_review" | "published" | "sold_out" | "rejected" | "archived"
type ProductType = "event_product" | "shop_product"

interface ProductOrderSummary {
  id: string
  title: string
  product_type: ProductType
  image: string | null
  status: ProductStatus
  order_count: number
  revenue: number
}

const STATUS_META: Record<
  ProductStatus,
  { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }
> = {
  draft:          { label: "Draft",     variant: "outline" },
  pending_review: { label: "In review", variant: "warning" },
  published:      { label: "Live",      variant: "success" },
  sold_out:       { label: "Sold out",  variant: "warning" },
  rejected:       { label: "Rejected",  variant: "destructive" },
  archived:       { label: "Archived",  variant: "destructive" },
}

function formatMoney(amount: number, currency = "LKR") {
  if (!Number.isFinite(amount)) return `${currency} —`
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function OrganizerOrdersByProductPage() {
  const { user, loading: authLoading } = useOrganizerGuard("/organizer/shop/orders")
  const [products, setProducts] = React.useState<ProductOrderSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [search, setSearch] = React.useState("")

  const fetchProducts = React.useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/organizer/shop/orders/by-product`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setProducts(data.data?.products ?? [])
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
    if (user && ["organizer", "superadmin"].includes(user.role || "")) {
      fetchProducts()
    }
  }, [user, fetchProducts])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return products
    const q = search.trim().toLowerCase()
    return products.filter((p) => p.title.toLowerCase().includes(q))
  }, [products, search])

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
        href="/organizer/shop"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to shop
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Receipt className="h-6 w-6 text-primary" />
          Orders
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a product to see its orders and current revenue.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            {products.length === 0 ? "No products yet" : "Nothing matches that search"}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {products.length === 0
              ? "Once you list a product, its orders and revenue will show up here."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/organizer/shop/${p.id}/orders`}
              className="group flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-full w-full p-3 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground group-hover:text-primary">
                    {p.title}
                  </span>
                  <Badge variant={STATUS_META[p.status].variant}>{STATUS_META[p.status].label}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.order_count} {p.order_count === 1 ? "order" : "orders"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue</div>
                  <div className="text-sm font-semibold text-foreground">{formatMoney(p.revenue)}</div>
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
