"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Loader,
  Package,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductForm, type ProductFormValues } from "@/components/organizer/product-form"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type ProductStatus = "draft" | "published" | "sold_out" | "archived"

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
}

const STATUS_META: Record<
  ProductStatus,
  { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }
> = {
  draft:     { label: "Draft",     variant: "outline" },
  published: { label: "Live",      variant: "success" },
  sold_out:  { label: "Sold out",  variant: "warning" },
  archived:  { label: "Archived",  variant: "destructive" },
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params!.id[0] : ""
  const { user, loading: authLoading } = useAuth()
  const [product, setProduct]     = React.useState<Product | null>(null)
  const [loading, setLoading]     = React.useState(true)
  const [error, setError]         = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [acting, setActing]       = React.useState(false)
  const [savedAt, setSavedAt]     = React.useState<number | null>(null)

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=/organizer/shop/${id}`)
      return
    }
    if (!["organizer", "superadmin"].includes(user.role || "")) {
      router.push("/become-organizer")
    }
  }, [authLoading, user, router, id])

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
        currency:            values.currency || "LKR",
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

  const runAction = async (action: "publish" | "unpublish" | "mark-sold-out" | "restore") => {
    setActing(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/${id}/${action}`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        setProduct(data.data?.product)
      } else {
        alert(data?.message || "Action failed.")
      }
    } catch {
      alert("Network error.")
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
        alert(data?.message || "Couldn't archive.")
      }
    } finally {
      setActing(false)
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
    currency:            product.currency || "LKR",
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
            {product.status === "draft" && (
              <Button size="sm" type="button" disabled={acting} onClick={() => runAction("publish")}>
                <Eye className="mr-1 h-4 w-4" />
                Publish
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
              <Button size="sm" type="button" disabled={acting} onClick={() => runAction("restore")}>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Restore
              </Button>
            ) : (
              <Button size="sm" type="button" variant="ghost" disabled={acting} onClick={handleArchive}>
                <Archive className="mr-1 h-4 w-4" />
                Archive
              </Button>
            )}
          </>
        }
      />
    </div>
  )
}
