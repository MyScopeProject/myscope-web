"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useOrganizerGuard } from "@/hooks/useOrganizerGuard"
import { ProductForm, type ProductFormValues } from "@/components/organizer/product-form"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function NewProductPage() {
  const router = useRouter()
  useOrganizerGuard("/organizer/shop/new")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (values: ProductFormValues) => {
    setSubmitting(true)
    setError("")
    try {
      if (values.product_type === "event_product" && !values.event_id) {
        setError("Pick an event for this product or switch to a shop product.")
        return
      }

      const needsPickup =
        values.product_type === "shop_product" &&
        (values.fulfillment === "pickup" || values.fulfillment === "both")

      const payload: Record<string, unknown> = {
        product_type:        values.product_type,
        event_id:            values.product_type === "event_product" ? values.event_id : undefined,
        title:               values.title,
        description:         values.description || null,
        category:            values.category || null,
        price:               Number(values.price),
        currency:            values.currency || "LKR",
        stock_quantity:      Number(values.stock_quantity),
        fulfillment:         values.fulfillment,
        pickup_location:     needsPickup ? (values.pickup_location || null) : null,
        pickup_location_url: needsPickup ? (values.pickup_location_url || null) : null,
        images:              values.images,
      }

      const res = await fetch(`${API_URL}/api/organizer/shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data?.success) {
        router.push(`/organizer/shop/${data.data.product.id}`)
      } else {
        setError(data?.message || "Couldn't create the product.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setSubmitting(false)
    }
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

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save it as a draft first. Once you&apos;ve added images and stock, submit it for admin review — it goes live after approval.
        </p>
      </div>

      <ProductForm
        submitLabel="Save draft"
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    </div>
  )
}
