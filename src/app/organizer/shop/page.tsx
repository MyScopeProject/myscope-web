"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ImageIcon,
  Loader,
  Loader2,
  Package,
  Plus,
  Receipt,
  Send,
  ShoppingBag,
  Tag,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type ProductStatus = "draft" | "pending_review" | "published" | "sold_out" | "rejected" | "archived"
type ProductType   = "event_product" | "shop_product"

interface ProductRow {
  id: string
  organizer_id: string
  product_type: ProductType
  event_id: string | null
  title: string
  description: string | null
  price: number | string
  currency: string
  stock_quantity: number
  fulfillment: "shipping" | "pickup" | "both"
  images: string[]
  category: string | null
  status: ProductStatus
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
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

const STATUS_FILTERS: Array<{ value: "all" | ProductStatus; label: string }> = [
  { value: "all",            label: "All" },
  { value: "draft",          label: "Drafts" },
  { value: "pending_review", label: "In review" },
  { value: "published",      label: "Live" },
  { value: "sold_out",       label: "Sold out" },
  { value: "rejected",       label: "Rejected" },
  { value: "archived",       label: "Archived" },
]

function formatMoney(amount: number | string, currency = "LKR") {
  const n = typeof amount === "number" ? amount : Number(amount)
  if (!Number.isFinite(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function OrganizerShopPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [products, setProducts] = React.useState<ProductRow[]>([])
  const [loading, setLoading]   = React.useState(true)
  const [error, setError]       = React.useState("")
  const [search, setSearch]     = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | ProductStatus>("all")
  const [actingId, setActingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ProductRow | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?redirect=/organizer/shop")
      return
    }
    if (!["organizer", "superadmin"].includes(user.role || "")) {
      router.push("/become-organizer")
    }
  }, [authLoading, user, router])

  const fetchProducts = React.useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/organizer/shop`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setProducts(data.data?.products ?? [])
      } else {
        setError(data?.message || "Failed to load products.")
      }
    } catch {
      setError("Network error loading products.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (user && ["organizer", "superadmin"].includes(user.role || "")) {
      fetchProducts()
    }
  }, [user, fetchProducts])

  const runAction = async (
    id: string,
    action: "submit" | "publish" | "unpublish" | "mark-sold-out" | "restore",
  ) => {
    setActingId(id)
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/${id}/${action}`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        if (data?.message) toast.success(data.message)
        await fetchProducts()
      } else {
        toast.error(data?.message || "Action failed.")
      }
    } catch {
      toast.error("Network error.")
    } finally {
      setActingId(null)
    }
  }

  const handleArchive = async (p: ProductRow) => {
    if (!confirm(`Archive "${p.title}"? It will be hidden from the public shop. You can restore it later.`)) return
    setActingId(p.id)
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/${p.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        await fetchProducts()
      } else {
        toast.error(data?.message || "Couldn't archive.")
      }
    } finally {
      setActingId(null)
    }
  }

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/${deleteTarget.id}/permanent`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        toast.success("Product permanently deleted.")
        setDeleteTarget(null)
        await fetchProducts()
      } else {
        toast.error(data?.message || "Couldn't delete.")
      }
    } catch {
      toast.error("Network error.")
    } finally {
      setDeleting(false)
    }
  }

  const filtered = React.useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          p.title?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [products, statusFilter, search])

  const counts = React.useMemo(() => {
    return products.reduce(
      (acc, p) => {
        acc.all += 1
        acc[p.status] += 1
        return acc
      },
      { all: 0, draft: 0, pending_review: 0, published: 0, sold_out: 0, rejected: 0, archived: 0 } as Record<"all" | ProductStatus, number>,
    )
  }, [products])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Shop
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sell event merch and organizer-wide products. New listings are reviewed by an admin before they go live.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/organizer/shop/orders" className="inline-flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Orders
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/organizer/shop/promo-codes" className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Promo codes
            </Link>
          </Button>
          <Button asChild>
            <Link href="/organizer/shop/new" className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New product
            </Link>
          </Button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or category..."
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                ({counts[f.value]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasAny={products.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const cover = Array.isArray(p.images) && p.images[0]
                const meta = STATUS_META[p.status]
                const acting = actingId === p.id
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/organizer/shop/${p.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-full w-full p-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground group-hover:text-primary">
                            {p.title}
                          </div>
                          {p.category && (
                            <div className="text-xs text-muted-foreground">{p.category}</div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.product_type === "event_product" ? "Event" : "Shop"}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {formatMoney(p.price, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.stock_quantity}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {p.status === "rejected" && p.rejection_reason && (
                        <p className="mt-1 max-w-[220px] text-xs text-destructive" title={p.rejection_reason}>
                          {p.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Draft: an already-approved product relists instantly;
                            a never-approved one must go through admin review. */}
                        {p.status === "draft" && (
                          p.approved_at ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() => runAction(p.id, "publish")}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Relist
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={acting}
                              onClick={() => runAction(p.id, "submit")}
                            >
                              <Send className="mr-1 h-3.5 w-3.5" />
                              Submit for review
                            </Button>
                          )
                        )}
                        {p.status === "pending_review" && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            Awaiting admin review
                          </span>
                        )}
                        {p.status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acting}
                            onClick={() => runAction(p.id, "submit")}
                          >
                            <Send className="mr-1 h-3.5 w-3.5" />
                            Resubmit
                          </Button>
                        )}
                        {p.status === "published" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() => runAction(p.id, "mark-sold-out")}
                            >
                              <Package className="mr-1 h-3.5 w-3.5" />
                              Sold out
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() => runAction(p.id, "unpublish")}
                            >
                              <EyeOff className="mr-1 h-3.5 w-3.5" />
                              Unpublish
                            </Button>
                          </>
                        )}
                        {p.status === "sold_out" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acting}
                            onClick={() => runAction(p.id, "unpublish")}
                          >
                            <EyeOff className="mr-1 h-3.5 w-3.5" />
                            Move to draft
                          </Button>
                        )}
                        {p.status === "archived" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() => runAction(p.id, "restore")}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={acting}
                              onClick={() => setDeleteTarget(p)}
                              title="Delete permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={acting}
                            onClick={() => handleArchive(p)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => { if (!deleting) setDeleteTarget(null) }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground">Delete permanently?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">&ldquo;{deleteTarget.title}&rdquo;</span> will be
                  removed for good — this can&apos;t be undone. Products with past orders can&apos;t be deleted;
                  archive them instead.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
      <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-3 text-lg font-semibold text-foreground">
        {hasAny ? "Nothing matches that filter" : "No products yet"}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {hasAny
          ? "Try a different status or clear the search."
          : "Create your first listing. Event merch attaches to a specific event; shop products live in your storefront."}
      </p>
      {!hasAny && (
        <Button asChild className="mt-4">
          <Link href="/organizer/shop/new" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add your first product
          </Link>
        </Button>
      )}
    </div>
  )
}
