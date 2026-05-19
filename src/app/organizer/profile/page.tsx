"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  ImagePlus,
  Landmark,
  Loader,
  Save,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Mirrors the organizer_profiles columns the GET /api/organizers/me endpoint
// returns. Bank fields exist on the same row but are managed elsewhere.
type VerificationStatus = "pending" | "approved" | "rejected" | null
type BusinessType = "individual" | "company" | "ngo" | null

interface OrganizerProfile {
  id: string
  business_name: string
  business_type: BusinessType
  phone: string | null
  nic_or_br: string | null
  profile_image_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  verification_status: VerificationStatus
  rejection_reason: string | null
  deactivated_at: string | null
  created_at: string
}

const VERIFICATION_META: Record<NonNullable<VerificationStatus>, {
  label: string
  variant: "default" | "warning" | "success" | "destructive"
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = {
  pending: {
    label: "Pending review",
    variant: "warning",
    icon: Clock,
    description: "Our admin team is reviewing your application. You can still edit the details below.",
  },
  approved: {
    label: "Verified organizer",
    variant: "success",
    icon: BadgeCheck,
    description: "You can publish events. Updates to your profile go live immediately.",
  },
  rejected: {
    label: "Application rejected",
    variant: "destructive",
    icon: XCircle,
    description: "Update the details below and resubmit your application.",
  },
}

const BUSINESS_TYPE_LABEL: Record<NonNullable<BusinessType>, string> = {
  individual: "Individual",
  company: "Company",
  ngo: "NGO",
}

export default function OrganizerProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [profile, setProfile] = React.useState<OrganizerProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  // Editable form state. Two independent sections — Business details (PATCHes
  // /me/profile) and Banking details (PATCHes /me/bank). Kept as separate
  // state objects so a failed save on one doesn't blow away typing in the other.
  const [form, setForm] = React.useState({
    business_name: "",
    business_type: "" as "" | NonNullable<BusinessType>,
    phone: "",
    profile_image_url: "",
  })
  const [bankForm, setBankForm] = React.useState({
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  })
  const [saving, setSaving] = React.useState(false)
  const [bankSaving, setBankSaving] = React.useState(false)
  const [imageUploading, setImageUploading] = React.useState(false)
  const [saveResult, setSaveResult] = React.useState<{ text: string; tone: "ok" | "err" } | null>(null)
  const [bankResult, setBankResult] = React.useState<{ text: string; tone: "ok" | "err" } | null>(null)

  // Auth + role guard — same shape used elsewhere.
  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/auth/login?redirect=/organizer/profile")
      return
    }
    if (user.role !== "organizer" && user.role !== "superadmin") {
      router.replace("/become-organizer")
    }
  }, [authLoading, user, router])

  const fetchProfile = React.useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/organizers/me`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        const p = (data.data?.profile ?? null) as OrganizerProfile | null
        setProfile(p)
        if (p) {
          setForm({
            business_name: p.business_name ?? "",
            business_type: (p.business_type ?? "") as "" | NonNullable<BusinessType>,
            phone: p.phone ?? "",
            profile_image_url: p.profile_image_url ?? "",
          })
          setBankForm({
            bank_name: p.bank_name ?? "",
            bank_account_number: p.bank_account_number ?? "",
            bank_account_name: p.bank_account_name ?? "",
          })
        }
      } else {
        setError(data?.message || "Failed to load profile.")
      }
    } catch {
      setError("Network error loading profile.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (user && ["organizer", "superadmin"].includes(user.role || "")) {
      fetchProfile()
    }
  }, [user, fetchProfile])

  const handleImagePick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSaveResult({ text: "Pick an image file.", tone: "err" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveResult({ text: "Image must be under 5 MB.", tone: "err" })
      return
    }
    setImageUploading(true)
    setSaveResult(null)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch(`${API_URL}/api/organizers/upload-profile-image`, {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      const body = await res.json()
      if (!body?.success) {
        setSaveResult({ text: body?.message || "Upload failed.", tone: "err" })
        return
      }
      setForm((prev) => ({ ...prev, profile_image_url: body.data?.url ?? "" }))
      setSaveResult({ text: "Image uploaded — remember to Save.", tone: "ok" })
    } catch {
      setSaveResult({ text: "Network error uploading image.", tone: "err" })
    } finally {
      setImageUploading(false)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_name.trim()) {
      setSaveResult({ text: "Business name is required.", tone: "err" })
      return
    }
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch(`${API_URL}/api/organizers/me/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: form.business_name.trim(),
          business_type: form.business_type || null,
          phone: form.phone.trim() || null,
          profile_image_url: form.profile_image_url || null,
        }),
      })
      const body = await res.json()
      setSaveResult({
        text: body?.message || (body?.success ? "Saved." : "Save failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) {
        setProfile(body.data?.profile ?? null)
      }
    } catch {
      setSaveResult({ text: "Network error saving profile.", tone: "err" })
    } finally {
      setSaving(false)
    }
  }

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault()
    // Either all three or all three blank — bank details only make sense as
    // a complete set. (Server side accepts partial, but UX-wise we don't want
    // half-filled rows that block payouts.)
    const anyFilled = !!(bankForm.bank_name.trim() || bankForm.bank_account_number.trim() || bankForm.bank_account_name.trim())
    const allFilled = !!(bankForm.bank_name.trim() && bankForm.bank_account_number.trim() && bankForm.bank_account_name.trim())
    if (anyFilled && !allFilled) {
      setBankResult({ text: "Fill all three bank fields, or leave all three blank.", tone: "err" })
      return
    }
    setBankSaving(true)
    setBankResult(null)
    try {
      const res = await fetch(`${API_URL}/api/organizers/me/bank`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: bankForm.bank_name.trim() || null,
          bank_account_number: bankForm.bank_account_number.trim() || null,
          bank_account_name: bankForm.bank_account_name.trim() || null,
        }),
      })
      const body = await res.json()
      setBankResult({
        text: body?.message || (body?.success ? "Bank details saved." : "Save failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) {
        setProfile(body.data?.profile ?? null)
      }
    } catch {
      setBankResult({ text: "Network error saving bank details.", tone: "err" })
    } finally {
      setBankSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error || "No organizer profile found."}</span>
        </div>
        <Button onClick={() => router.push("/become-organizer")}>Apply to become an organizer</Button>
      </div>
    )
  }

  const meta = profile.verification_status ? VERIFICATION_META[profile.verification_status] : null
  const VerificationIcon = meta?.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The details attendees see on your event pages. Updates apply to new and existing events.
        </p>
      </div>

      {/* Verification status banner */}
      {meta && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            profile.verification_status === "approved" && "border-emerald-500/30 bg-emerald-500/10",
            profile.verification_status === "pending" && "border-amber-500/30 bg-amber-500/10",
            profile.verification_status === "rejected" && "border-destructive/30 bg-destructive/10",
          )}
        >
          {VerificationIcon && (
            <span
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                profile.verification_status === "approved" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                profile.verification_status === "pending" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                profile.verification_status === "rejected" && "bg-destructive/15 text-destructive",
              )}
            >
              <VerificationIcon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.variant}>{meta.label}</Badge>
              {profile.deactivated_at && (
                <Badge variant="outline">
                  <ShieldAlert className="h-3 w-3" />
                  Deactivated
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-foreground/80">{meta.description}</p>
            {profile.verification_status === "rejected" && profile.rejection_reason && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                <span className="font-semibold">Reason:</span> {profile.rejection_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={save} className="space-y-6">
        {/* Brand image */}
        <section className="rounded-xl border border-border bg-card p-5">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Brand image</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Shown on your event pages. Square images work best. PNG or JPG, max 5 MB.
            </p>
          </header>
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              {form.profile_image_url ? (
                // Next/Image needs known dimensions and either a configured loader or
                // unoptimized for cross-origin URLs. Plain <img> avoids that hassle.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.profile_image_url} alt="Brand" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Building2 className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImagePick(f)
                    e.target.value = ""
                  }}
                />
                <span
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted",
                    imageUploading && "opacity-60 pointer-events-none",
                  )}
                >
                  {imageUploading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  {imageUploading ? "Uploading…" : form.profile_image_url ? "Replace image" : "Upload image"}
                </span>
              </label>
              {form.profile_image_url && (
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, profile_image_url: "" }))}
                  className="block text-xs text-destructive hover:underline"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Business details */}
        <section className="rounded-xl border border-border bg-card p-5">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Business details</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Attendees see your business name on every event you publish.
            </p>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business name" required>
              <Input
                type="text"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="e.g. Sansare Live"
                required
              />
            </Field>
            <Field label="Business type">
              <select
                aria-label="Business type"
                value={form.business_type}
                onChange={(e) => setForm({ ...form, business_type: e.target.value as "" | NonNullable<BusinessType> })}
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="">Not specified</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
                <option value="ngo">NGO</option>
              </select>
            </Field>
            <Field label="Contact phone" helper="WhatsApp-friendly. Used as the venue contact channel.">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+94 77 123 4567"
                autoComplete="tel"
              />
            </Field>
          </div>

          {/* Read-only context */}
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
            {profile.nic_or_br && (
              <ReadonlyRow label="NIC / BR" value={profile.nic_or_br} />
            )}
            {profile.business_type && (
              <ReadonlyRow
                label="Current type"
                value={BUSINESS_TYPE_LABEL[profile.business_type] || "—"}
              />
            )}
            <ReadonlyRow label="Member since" value={new Date(profile.created_at).toLocaleDateString()} />
            {profile.deactivated_at && (
              <ReadonlyRow
                label="Deactivated"
                value={new Date(profile.deactivated_at).toLocaleDateString()}
              />
            )}
          </div>
        </section>

        {/* Save bar */}
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border bg-card p-4">
          {saveResult && (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-sm",
              saveResult.tone === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
            )}>
              {saveResult.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {saveResult.text}
            </span>
          )}
          <Button type="submit" disabled={saving || imageUploading}>
            {saving ? <Loader className="animate-spin" /> : <Save />}
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>

      {/* Banking details — separate form because the backend endpoint is
          separate, and a payment-detail change deserves its own commit so
          partial typing in one section doesn't block saves on the other. */}
      <form onSubmit={saveBank} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <header className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Landmark className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold text-foreground">Banking details</h2>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bank name">
            <Input
              type="text"
              value={bankForm.bank_name}
              onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
              placeholder="Commercial Bank of Ceylon"
              autoComplete="off"
            />
          </Field>
          <Field label="Account holder name">
            <Input
              type="text"
              value={bankForm.bank_account_name}
              onChange={(e) => setBankForm({ ...bankForm, bank_account_name: e.target.value })}
              placeholder="A. Perera"
              autoComplete="off"
            />
          </Field>
          <Field label="Account number">
            <Input
              type="text"
              inputMode="numeric"
              value={bankForm.bank_account_number}
              onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="8001234567890"
              autoComplete="off"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {bankResult && (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-sm",
              bankResult.tone === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
            )}>
              {bankResult.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {bankResult.text}
            </span>
          )}
          <Button type="submit" disabled={bankSaving}>
            {bankSaving ? <Loader className="animate-spin" /> : <Save />}
            {bankSaving ? "Saving…" : "Save bank details"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string
  required?: boolean
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  )
}
