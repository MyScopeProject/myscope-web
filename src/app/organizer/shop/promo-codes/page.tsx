"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
  AlertCircle,
  ArrowLeft,
  Loader,
  Percent,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type DiscountType = "percentage" | "fixed"

interface PromoCode {
  id: string
  code: string
  discount_type: DiscountType
  discount_value: number | string
  max_uses: number | null
  used_count: number
  min_total: number | string | null
  valid_from: string | null
  valid_until: string | null
  active: boolean
  product_id: string | null
  created_at: string
}

// Lightweight subset of the product list used by the picker. The endpoint
// returns more fields; we only need id + title to populate <option>s.
interface ProductOption {
  id: string
  title: string
  status: "draft" | "published" | "sold_out" | "archived"
}

interface FormValues {
  code: string
  discount_type: DiscountType
  discount_value: string
  max_uses: string
  min_total: string
  valid_from: string
  valid_until: string
  active: boolean
  // Empty string = storefront-wide; otherwise a specific product_id.
  product_id: string
}

const emptyForm: FormValues = {
  code: "",
  discount_type: "percentage",
  discount_value: "",
  max_uses: "",
  min_total: "",
  valid_from: "",
  valid_until: "",
  active: true,
  product_id: "",
}

function formatNumber(n: number | string | null | undefined) {
  if (n === null || n === undefined) return ""
  const v = typeof n === "number" ? n : Number(n)
  if (!Number.isFinite(v)) return ""
  return v.toLocaleString()
}

function localizeDateTimeInput(value: string | null): string {
  // Backend sends ISO strings; <input type="datetime-local"> wants YYYY-MM-DDTHH:mm.
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ShopPromoCodesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [codes, setCodes] = React.useState<PromoCode[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [editing, setEditing] = React.useState<PromoCode | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState<FormValues>(emptyForm)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")
  // Products available to scope a promo to. Loaded once on first auth so the
  // picker is ready when the organizer opens the form.
  const [products, setProducts] = React.useState<ProductOption[]>([])

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?redirect=/organizer/shop/promo-codes")
      return
    }
    if (!["organizer", "superadmin"].includes(user.role || "")) {
      router.push("/become-organizer")
    }
  }, [authLoading, user, router])

  const fetchCodes = React.useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/organizer/shop/promo-codes`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setCodes(data.data?.promo_codes ?? [])
      } else {
        setError(data?.message || "Couldn't load promo codes.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (user && ["organizer", "superadmin"].includes(user.role || "")) {
      fetchCodes()
    }
  }, [user, fetchCodes])

  // Load the organizer's product list for the picker. Drafts/sold-out/archived
  // are still selectable — an organizer might create a code in advance for a
  // product that's still a draft, or keep a code attached to a sold-out
  // product they plan to restock.
  React.useEffect(() => {
    if (!user || !["organizer", "superadmin"].includes(user.role || "")) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizer/shop`, { credentials: "include" })
        const data = await res.json()
        if (!cancelled && data?.success) {
          setProducts((data.data?.products ?? []).map((p: ProductOption) => ({
            id: p.id, title: p.title, status: p.status,
          })))
        }
      } catch { /* picker just stays empty; storefront-wide still works */ }
    })()
    return () => { cancelled = true }
  }, [user])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
    setSubmitError("")
  }

  const openEdit = (c: PromoCode) => {
    setEditing(c)
    setForm({
      code:           c.code,
      discount_type:  c.discount_type,
      discount_value: String(c.discount_value ?? ""),
      max_uses:       c.max_uses != null ? String(c.max_uses) : "",
      min_total:      c.min_total != null ? String(c.min_total) : "",
      valid_from:     localizeDateTimeInput(c.valid_from),
      valid_until:    localizeDateTimeInput(c.valid_until),
      active:         c.active,
      product_id:     c.product_id ?? "",
    })
    setShowForm(true)
    setSubmitError("")
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
    setSubmitError("")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError("")
    try {
      const payload: Record<string, unknown> = {
        code:           form.code.trim().toUpperCase(),
        discount_type:  form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses:       form.max_uses ? Number(form.max_uses) : null,
        min_total:      form.min_total ? Number(form.min_total) : null,
        valid_from:     form.valid_from || null,
        valid_until:    form.valid_until || null,
        active:         form.active,
        product_id:     form.product_id || null,
      }
      const url = editing
        ? `${API_URL}/api/organizer/shop/promo-codes/${editing.id}`
        : `${API_URL}/api/organizer/shop/promo-codes`
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data?.success) {
        await fetchCodes()
        closeForm()
      } else {
        setSubmitError(data?.message || "Couldn't save.")
      }
    } catch {
      setSubmitError("Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (c: PromoCode) => {
    if (!confirm(`Delete code "${c.code}"?`)) return
    try {
      const res = await fetch(`${API_URL}/api/organizer/shop/promo-codes/${c.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        await fetchCodes()
      } else {
        toast.error(data?.message || "Couldn't delete.")
      }
    } catch {
      toast.error("Network error.")
    }
  }

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

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Tag className="h-6 w-6 text-primary" />
            Shop promo codes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Storefront-wide codes that apply to your shop. Buyers redeem them at checkout once shop checkout launches.
          </p>
        </div>
        <Button onClick={openNew} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New code
        </Button>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {codes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Tag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">No promo codes yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Set up codes now so they're ready when shop checkout launches.
          </p>
          <Button className="mt-4" onClick={openNew}>Create your first code</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Applies to</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Min cart</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((c) => {
                const scopedProduct = c.product_id ? products.find((p) => p.id === c.product_id) : null
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-foreground">{c.code}</td>
                    <td className="px-4 py-3 text-foreground">
                      {c.discount_type === "percentage"
                        ? `${formatNumber(c.discount_value)}%`
                        : `LKR ${formatNumber(c.discount_value)}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.product_id ? (
                        <span className="inline-flex max-w-48 items-center gap-1 truncate rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {scopedProduct?.title ?? `Product ${c.product_id.slice(0, 6)}`}
                        </span>
                      ) : (
                        <span className="text-xs">All products</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.min_total != null ? `LKR ${formatNumber(c.min_total)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.active ? "success" : "outline"}>{c.active ? "Active" : "Off"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeForm}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Percent className="h-5 w-5 text-primary" />
                {editing ? "Edit code" : "New code"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Code *</label>
              <Input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="FINALS10"
                maxLength={32}
                disabled={!!editing}
                className="font-mono uppercase"
              />
              {editing && (
                <p className="text-[10px] text-muted-foreground">Codes can't be renamed after creation.</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Discount type</label>
                <div className="flex gap-1.5">
                  {(["percentage", "fixed"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, discount_type: t }))}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors",
                        form.discount_type === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {t === "percentage" ? "% off" : "LKR off"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Discount {form.discount_type === "percentage" ? "(%)" : "(LKR)"} *
                </label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Max uses (optional)</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_uses}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Min cart (LKR, optional)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_total}
                  onChange={(e) => setForm((f) => ({ ...f, min_total: e.target.value }))}
                  placeholder="No minimum"
                />
              </div>
            </div>

            {/* Optional product scope. Default "All products" → storefront-wide
                code (existing behavior). Picking a product restricts the code
                to carts containing that product, and the discount applies to
                that product's line total only. */}
            <div className="space-y-1.5">
              <label htmlFor="promo-product" className="text-xs font-medium text-muted-foreground">
                Apply to (optional)
              </label>
              <select
                id="promo-product"
                value={form.product_id}
                onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card/30 px-3 py-2 text-sm text-foreground backdrop-blur-md transition-colors focus:border-primary/50 focus:bg-card/50 focus:outline-none"
              >
                <option value="">All products (storefront-wide)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}{p.status !== "published" ? ` (${p.status})` : ""}
                  </option>
                ))}
              </select>
              {form.product_id && (
                <p className="text-[10px] text-muted-foreground">
                  Discount applies only when this product is in the cart, and only to its line total.
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Valid from</label>
                <Input
                  type="datetime-local"
                  value={form.valid_from}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Valid until</label>
                <Input
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              Active
            </label>

            {submitError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                {submitError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
