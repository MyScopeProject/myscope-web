"use client"

import * as React from "react"
import { Check, Loader, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export type ProductFormValues = {
  product_type: "event_product" | "shop_product"
  event_id: string | null
  title: string
  description: string
  category: string
  price: string  // string in form, parsed at submit
  stock_quantity: string
  fulfillment: "shipping" | "pickup" | "both"
  pickup_location: string
  pickup_location_url: string
  images: string[]
}

export type EventOption = {
  id: string
  title: string
  approval_status: string
}

interface ProductFormProps {
  initial?: Partial<ProductFormValues>
  // When provided, product_type/event_id fields are read-only (used on the
  // edit page since changing the type would break event-linked listings).
  lockType?: boolean
  submitLabel: string
  onSubmit: (values: ProductFormValues) => Promise<void> | void
  submitting?: boolean
  error?: string
  // Footer slot for status-transition buttons (Publish, Archive, etc.) so
  // they sit alongside Save instead of floating at the top of the page.
  actions?: React.ReactNode
  // Timestamp (ms) of the last successful save. ProductForm shows a
  // transient "Saved" indicator when this is within the recent past.
  savedAt?: number | null
}

const defaults: ProductFormValues = {
  product_type:        "shop_product",
  event_id:            null,
  title:               "",
  description:         "",
  category:            "",
  price:               "",
  stock_quantity:      "1",
  fulfillment:         "shipping",
  pickup_location:     "",
  pickup_location_url: "",
  images:              [],
}

export function ProductForm({
  initial,
  lockType = false,
  submitLabel,
  onSubmit,
  submitting = false,
  error,
  actions,
  savedAt,
}: ProductFormProps) {
  const [values, setValues]       = React.useState<ProductFormValues>({ ...defaults, ...initial })
  const [events, setEvents]       = React.useState<EventOption[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState("")

  // Load organizer's events for the event picker. Even when starting as a
  // shop_product, we fetch eagerly so toggling the type doesn't lag.
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizer/events?when=all`, {
          credentials: "include",
        })
        const data = await res.json()
        if (!cancelled && data?.success) {
          // Only approved (live) events make sense to attach products to.
          // Drafts/pending/rejected/cancelled events shouldn't surface merch.
          const eligible = (data.data?.events ?? []).filter(
            (e: EventOption) => e.approval_status === "approved",
          )
          setEvents(eligible)
        }
      } catch { /* picker stays empty; the form still works for shop products */ }
    })()
    return () => { cancelled = true }
  }, [])

  const update = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  // Type toggle: when flipping to shop_product, clear event_id; when flipping
  // to event_product, keep whatever was selected (or default to first event).
  const setProductType = (type: ProductFormValues["product_type"]) => {
    setValues((prev) => {
      if (type === "shop_product") return { ...prev, product_type: type, event_id: null }
      return {
        ...prev,
        product_type: type,
        event_id: prev.event_id ?? (events[0]?.id ?? null),
      }
    })
  }

  const handleUpload = async (file: File) => {
    setUploadError("")
    if (values.images.length >= 8) {
      setUploadError("Maximum 8 images.")
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append("image", file)
      const res = await fetch(`${API_URL}/api/organizer/shop/upload-image`, {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const data = await res.json()
      if (data?.success && data.data?.url) {
        setValues((prev) => ({ ...prev, images: [...prev.images, data.data.url] }))
      } else {
        setUploadError(data?.message || "Upload failed.")
      }
    } catch {
      setUploadError("Network error.")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setValues((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product type */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Product type</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Event products attach to a specific event and show under that event's "Merch" section.
          Shop products are organizer-wide and only appear in the global shop and your storefront.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <TypeCard
            label="Event product"
            description="Tied to one of your events."
            selected={values.product_type === "event_product"}
            disabled={lockType}
            onClick={() => setProductType("event_product")}
          />
          <TypeCard
            label="Shop product"
            description="General merch, sold under your storefront."
            selected={values.product_type === "shop_product"}
            disabled={lockType}
            onClick={() => setProductType("shop_product")}
          />
        </div>

        {values.product_type === "event_product" && (
          <div className="mt-4 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Event</label>
            <select
              required
              aria-label="Event"
              disabled={lockType}
              value={values.event_id ?? ""}
              onChange={(e) => update("event_id", e.target.value || null)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select an event...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
            {events.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No live events yet. Create and approve an event first, or use a shop product.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Basics */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Basics</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Title *</label>
          <Input
            required
            maxLength={255}
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="VIP T-Shirt — Finals 2026"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea
            rows={4}
            maxLength={5000}
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="What's included, sizing, materials..."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Input
              maxLength={64}
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              placeholder="Apparel, Posters..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Price *</label>
            <Input
              required
              type="number"
              step="0.01"
              min="0"
              value={values.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="1500.00"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Stock *</label>
            <Input
              required
              type="number"
              min="0"
              step="1"
              value={values.stock_quantity}
              onChange={(e) => update("stock_quantity", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fulfillment</label>
            <div className="flex gap-1.5">
              {(["shipping", "pickup", "both"] as const).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => update("fulfillment", opt)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors",
                    values.fulfillment === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {opt === "both" ? "Both" : opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pickup location applies only to shop products with pickup fulfillment.
            Event products inherit pickup from the linked event's venue, so the
            fields stay hidden in that case. */}
        {values.product_type === "shop_product" &&
         (values.fulfillment === "pickup" || values.fulfillment === "both") && (
          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pickup details
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pickup location *</label>
              <Input
                required
                maxLength={512}
                value={values.pickup_location}
                onChange={(e) => update("pickup_location", e.target.value)}
                placeholder="e.g. Galle Face Hotel lobby, Colombo 03"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Map link (optional)</label>
              <Input
                type="url"
                maxLength={2048}
                value={values.pickup_location_url}
                onChange={(e) => update("pickup_location_url", e.target.value)}
                placeholder="https://maps.google.com/?q=..."
              />
              <p className="text-[10px] text-muted-foreground">
                Paste a Google Maps or any other map URL so buyers can navigate.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Images */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Images</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          First image is used as the cover. Up to 8 images, 5MB each (JPEG/PNG/WebP).
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {values.images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 rounded-full bg-background/90 p-1 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Cover
                </span>
              )}
            </div>
          ))}

          {values.images.length < 8 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground hover:bg-muted">
              {uploading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span>{uploading ? "Uploading..." : "Upload"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                  e.target.value = ""
                }}
              />
            </label>
          )}
        </div>

        {uploadError && (
          <p className="mt-2 text-xs text-destructive">{uploadError}</p>
        )}
      </section>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Footer — Save + status-transition buttons share a single row so
          the organizer's eye doesn't have to jump between page header and
          form bottom. The "Saved" indicator appears for ~2s after a
          successful save via the savedAt prop. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <SavedIndicator savedAt={savedAt} />
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}

// Transient "Saved" indicator — fades visibility after 2.5s without
// unmounting. Returns an invisible placeholder when there's no recent save
// so the footer keeps its layout consistent.
function SavedIndicator({ savedAt }: { savedAt?: number | null }) {
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    if (!savedAt) {
      setVisible(false)
      return
    }
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(t)
  }, [savedAt])
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-success transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-live="polite"
    >
      <Check className="h-4 w-4" />
      Saved
    </span>
  )
}

function TypeCard({
  label, description, selected, disabled, onClick,
}: {
  label: string; description: string; selected: boolean; disabled?: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:bg-muted",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
    </button>
  )
}
