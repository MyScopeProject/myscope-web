"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Loader,
  Loader2,
  Package,
  Send,
  Trash2,
} from "lucide-react"
import { useOrganizerGuard } from "@/hooks/useOrganizerGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductForm, type ProductFormValues } from "@/components/organizer/product-form"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type ProductStatus = "draft" | "pending_review" | "published" | "sold_out" | "rejected" | "archived"

interface Product {
  id: string
  product_type: "event_product" | "shop_product"
  event_id: string | null
  title: string
  description: string | null
  category: string | null
  price: number | string
  currency: string
  stock_quantity: number
  fulfillment: "shipping" | "pickup" | "both"
  pickup_location: string | null
  pickup_location_url: string | null
  images: string[]
  status: ProductStatus
  approved_at: string | null
  rejection_reason: string | null
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

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params!.id[0] : ""
  const { user, loading: authLoading } = useOrganizerGuard(`/organizer/shop/${id}`)
  const [product, setProduct]     = React.useState<Product | null>(null)
  const [loading, setLoading]     = React.useState(true)
  const [error, setError]         = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [acting, setActing]       = React.useState(false)
  const [savedAt, setSavedAt]     = React.useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [deleting, setDeleting]   = React.useState(false)

  const fetchProduct = React.useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/organizer/shop/${id}`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setProduct(data.data?.product)
      } else {
        setError(data?.message || "Couldn't load product.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    if (user && ["organizer", "superadmin"].includes(user.role || "")) {
      fetchProduct()
    }
  }, [user, fetchProduct])

  const handleSave = async (values: ProductFormValues) => {
    setSubmitting(true)
    setError("")
    try {
      const needsPickup =
        values.product_type === "shop_product" &&
        (values.fulfillment === "pickup" || values.fulfillment === "both")

      const payload: Record<string, unknown> = {
        title:               values.title,
        description:         values.description || null,
        category:             values.category || null,
        price:               Number(values.price),
        stock_quantity:      Number(values.stock_quantity),
        fulfillment:         values.fulfillment,
        pickup_location:     needsPickup ? (values.pickup_location || null) : null,
        pickup_location_url: needsPickup ? (values.pickup_location_url || null) : null,
        images:              values.images,
      }

      const res = await fetch(`${API_URL}/api/organizer/shop/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data?.success) {
        setProduct(data.data?.product)
        setSavedAt(Date.now())
      } else {
        setError(data?.message || "Couldn't save.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  const runAction = async (action: "submit" | "publish" | "unpublish" | "mark-sold-out" | "restore") => {
    setActing(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/${id}/${action}`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        setProduct(data.data?.product)
        if (data?.message) toast.success(data.message)
      } else {
        toast.error(data?.message || "Action failed.")
      }
    } catch {
      toast.error("Network error.")
    } finally {
      setActing(false)
    }
  }

  const handleArchive = async () => {
    if (!product) return
    if (!confirm(`Archive "${product.title}"?`)) return
    setActing(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        setProduct(data.data?.product)
      } else {
        toast.error(data?.message || "Couldn't archive.")
      }
    } finally {
      setActing(false)
    }
  }

  const handlePermanentDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/${id}/permanent`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        toast.success("Product permanently deleted.")
        router.push("/organizer/shop")
      } else {
        toast.error(data?.message || "Couldn't delete.")
        setShowDeleteModal(false)
      }
    } catch {
      toast.error("Network error.")
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {error || "Product not found."}
        <div className="mt-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/organizer/shop">Back to shop</Link>
          </Button>
        </div>
      </div>
    )
  }

  const initial: Partial<ProductFormValues> = {
    product_type:        product.product_type,
    event_id:            product.event_id,
    title:               product.title,
    description:         product.description ?? "",
    category:            product.category ?? "",
    price:               String(product.price ?? ""),
    stock_quantity:      String(product.stock_quantity ?? 0),
    fulfillment:         product.fulfillment,
    pickup_location:     product.pickup_location ?? "",
    pickup_location_url: product.pickup_location_url ?? "",
    images:              Array.isArray(product.images) ? product.images : [],
  }

  const meta = STATUS_META[product.status]

  return (
    <div className="space-y-6">
      <Link
        href="/organizer/shop"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to shop
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{product.title}</h1>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Edit product details and manage status.</p>
        </div>
        {product.status === "published" && (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/shop/${product.id}`}
              target="_blank"
              className="inline-flex items-center gap-1"
            >
              View public <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </header>

      {/* Review-status banners */}
      {product.status === "pending_review" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This product is awaiting admin review. It won&apos;t appear in the public shop until it&apos;s approved.
            Editing it here keeps it in the review queue.
          </span>
        </div>
      )}
      {product.status === "rejected" && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">An admin rejected this product.</p>
            {product.rejection_reason && <p className="mt-0.5">{product.rejection_reason}</p>}
            <p className="mt-0.5 text-destructive/80">Make your changes and resubmit for review.</p>
          </div>
        </div>
      )}

      <ProductForm
        key={product.id + product.status}
        initial={initial}
        lockType
        submitLabel="Save changes"
        onSubmit={handleSave}
        submitting={submitting}
        error={error}
        savedAt={savedAt}
        actions={
          <>
            {/* Draft: relist instantly if already approved, else submit to review. */}
            {product.status === "draft" && (
              product.approved_at ? (
                <Button size="sm" type="button" disabled={acting} onClick={() => runAction("publish")}>
                  <Eye className="mr-1 h-4 w-4" />
                  Relist
                </Button>
              ) : (
                <Button size="sm" type="button" disabled={acting} onClick={() => runAction("submit")}>
                  <Send className="mr-1 h-4 w-4" />
                  Submit for review
                </Button>
              )
            )}
            {product.status === "rejected" && (
              <Button size="sm" type="button" disabled={acting} onClick={() => runAction("submit")}>
                <Send className="mr-1 h-4 w-4" />
                Resubmit for review
              </Button>
            )}
            {product.status === "published" && (
              <>
                <Button size="sm" type="button" variant="outline" disabled={acting} onClick={() => runAction("mark-sold-out")}>
                  <Package className="mr-1 h-4 w-4" />
                  Mark sold out
                </Button>
                <Button size="sm" type="button" variant="outline" disabled={acting} onClick={() => runAction("unpublish")}>
                  <EyeOff className="mr-1 h-4 w-4" />
                  Unpublish
                </Button>
              </>
            )}
            {product.status === "sold_out" && (
              <Button size="sm" type="button" variant="outline" disabled={acting} onClick={() => runAction("unpublish")}>
                <EyeOff className="mr-1 h-4 w-4" />
                Move to draft
              </Button>
            )}
            {product.status === "archived" ? (
              <>
                <Button size="sm" type="button" disabled={acting} onClick={() => runAction("restore")}>
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  disabled={acting}
                  onClick={() => setShowDeleteModal(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete permanently
                </Button>
              </>
            ) : (
              <Button size="sm" type="button" variant="ghost" disabled={acting} onClick={handleArchive}>
                <Archive className="mr-1 h-4 w-4" />
                Archive
              </Button>
            )}
          </>
        }
      />

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => { if (!deleting) setShowDeleteModal(false) }}
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
                  <span className="font-semibold text-foreground">&ldquo;{product.title}&rdquo;</span> will be
                  removed for good — this can&apos;t be undone. Products with past orders can&apos;t be deleted;
                  archive them instead.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
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
