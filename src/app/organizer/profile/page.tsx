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
import { useOrganizerGuard } from "@/hooks/useOrganizerGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ResignDangerZone } from "@/components/organizer/resign-danger-zone"
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
  // `phone` is the witness's mobile/WhatsApp number (registration step 2).
  phone: string | null
  nic_or_br: string | null
  profile_image_url: string | null
  witness_name: string | null
  witness_nic: string | null
  witness_email: string | null
  // Optional social links shown on the public "Organized by" card. Editable
  // here so organizers can update them post-approval.
  facebook_url: string | null
  instagram_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  branch_name: string | null
  bank_code: string | null
  branch_code: string | null
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
  const { user, loading: authLoading } = useOrganizerGuard("/organizer/profile")

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
    witness_name: "",
    witness_nic: "",
    witness_email: "",
    facebook_url: "",
    instagram_url: "",
  })
  const [bankForm, setBankForm] = React.useState({
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    branch_name: "",
    bank_code: "",
    branch_code: "",
  })
  const [saving, setSaving] = React.useState(false)
  const [bankSaving, setBankSaving] = React.useState(false)
  const [imageUploading, setImageUploading] = React.useState(false)
  const [saveResult, setSaveResult] = React.useState<{ text: string; tone: "ok" | "err" } | null>(null)
  const [bankResult, setBankResult] = React.useState<{ text: string; tone: "ok" | "err" } | null>(null)
  // Transient "just saved" pulse on the save buttons. Auto-resets after ~2.5s
  // so the button returns to its default label once the success is visually
  // acknowledged. Keeps the action button itself as the source of truth for
  // the saved state instead of relying on the inline status text.
  const [profileJustSaved, setProfileJustSaved] = React.useState(false)
  const [bankJustSaved, setBankJustSaved] = React.useState(false)

  React.useEffect(() => {
    if (!profileJustSaved) return
    const t = setTimeout(() => setProfileJustSaved(false), 2500)
    return () => clearTimeout(t)
  }, [profileJustSaved])

  React.useEffect(() => {
    if (!bankJustSaved) return
    const t = setTimeout(() => setBankJustSaved(false), 2500)
    return () => clearTimeout(t)
  }, [bankJustSaved])

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
            witness_name: p.witness_name ?? "",
            witness_nic: p.witness_nic ?? "",
            witness_email: p.witness_email ?? "",
            facebook_url: p.facebook_url ?? "",
            instagram_url: p.instagram_url ?? "",
          })
          setBankForm({
            bank_name: p.bank_name ?? "",
            bank_account_number: p.bank_account_number ?? "",
            bank_account_name: p.bank_account_name ?? "",
            branch_name: p.branch_name ?? "",
            bank_code: p.bank_code ?? "",
            branch_code: p.branch_code ?? "",
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
          witness_name: form.witness_name.trim() || null,
          witness_nic: form.witness_nic.trim() || null,
          witness_email: form.witness_email.trim() || null,
          facebook_url: form.facebook_url.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
        }),
      })
      const body = await res.json()
      setSaveResult({
        text: body?.message || (body?.success ? "Saved." : "Save failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) {
        setProfile(body.data?.profile ?? null)
        setProfileJustSaved(true)
      }
    } catch {
      setSaveResult({ text: "Network error saving profile.", tone: "err" })
    } finally {
      setSaving(false)
    }
  }

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault()
    // Either the required set in full or everything blank — bank details only
    // make sense as a complete set. (Server side accepts partial, but UX-wise
    // we don't want half-filled rows that block payouts.) Bank code and branch
    // code are optional, but typing only a code with no account is a dead end,
    // so any input at all requires the four core fields.
    const required = [
      bankForm.bank_name,
      bankForm.bank_account_number,
      bankForm.bank_account_name,
      bankForm.branch_name,
    ]
    const anyFilled = [...required, bankForm.bank_code, bankForm.branch_code].some((v) => v.trim())
    const requiredFilled = required.every((v) => v.trim())
    if (anyFilled && !requiredFilled) {
      setBankResult({ text: "Fill bank, branch, account name and account number, or leave them all blank.", tone: "err" })
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
          branch_name: bankForm.branch_name.trim() || null,
          bank_code: bankForm.bank_code.trim() || null,
          branch_code: bankForm.branch_code.trim() || null,
        }),
      })
      const body = await res.json()
      setBankResult({
        text: body?.message || (body?.success ? "Bank details saved." : "Save failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) {
        setProfile(body.data?.profile ?? null)
        setBankJustSaved(true)
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

      {/* Verification status — premium card with gradient backdrop, larger
          status hierarchy, and a glow accent on the badge for approved. The
          status hint chip (top-right) gives a calm secondary anchor without
          shouting; the headline does the heavy lifting visually. */}
      {meta && (() => {
        const status = profile.verification_status
        const isApproved = status === "approved"
        const isPending  = status === "pending"
        const isRejected = status === "rejected"

        // Per-status palette. Kept on this case branch (not Tailwind cn())
        // so adjustments are obvious at a glance.
        // Solid surface — no gradient. Per-status accent lives in the ring,
        // status pip, and (for approved) the soft glow blob.
        const palette = isApproved
          ? {
              ring: "ring-1 ring-primary/25 dark:ring-primary/25",
              bg: "bg-card dark:bg-card/60 dark:backdrop-blur-sm",
              accent: "text-primary",
              accentDot: "bg-primary",
            }
          : isPending
          ? {
              ring: "ring-1 ring-amber-200/70 dark:ring-amber-400/20",
              bg: "bg-card dark:bg-card/60 dark:backdrop-blur-sm",
              accent: "text-amber-700 dark:text-amber-300",
              accentDot: "bg-amber-500",
            }
          : {
              ring: "ring-1 ring-destructive/20",
              bg: "bg-card dark:bg-card/60 dark:backdrop-blur-sm",
              accent: "text-destructive",
              accentDot: "bg-destructive",
            }
        const headline = isApproved ? "Verified Organizer"
          : isPending ? "Pending Review"
          : "Application Rejected"

        return (
          <section
            className={cn(
              "rounded-xl border border-border p-4",
              palette.bg,
              palette.ring,
            )}
          >
            <div className="flex items-center gap-3">
              {/* Badge / icon — small and to the point, no glow. */}
              {isApproved ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/Images/verified%20badge.png"
                  alt="Verified organizer"
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0"
                />
              ) : VerificationIcon ? (
                <div
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isPending && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                    isRejected && "bg-destructive/15 text-destructive",
                  )}
                >
                  <VerificationIcon className="h-4 w-4" />
                </div>
              ) : null}

              {/* Status — one line, no redundant label pip above the headline. */}
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">{headline}</h2>
                <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
              </div>
            </div>

            {/* Deactivated chip — separate from status because being
                deactivated is orthogonal to approval state. */}
            {profile.deactivated_at && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-zinc-600 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                <ShieldAlert className="h-3 w-3" />
                Account deactivated
              </div>
            )}

            {/* Rejection reason — quoted block, not a destructive banner,
                because we already conveyed the rejection above. */}
            {isRejected && profile.rejection_reason && (
              <blockquote className="mt-3 rounded-lg border-l-4 border-destructive/40 bg-white/60 px-3 py-2 text-xs text-foreground/80 backdrop-blur dark:bg-zinc-800/40">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                  Reviewer note
                </div>
                {profile.rejection_reason}
              </blockquote>
            )}
          </section>
        )
      })()}

      {/* Form */}
      <form onSubmit={save} className="space-y-6">
        {/* Brand image */}
        <section className="rounded-xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5">
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
        <section className="rounded-xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5">
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
                className="h-9 w-full rounded-md border border-border bg-card/30 px-3 text-sm text-foreground backdrop-blur-md transition-colors focus:border-primary/50 focus:bg-card/50 focus:outline-none"
              >
                <option value="">Not specified</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
                <option value="ngo">NGO</option>
              </select>
            </Field>
            {/* Optional social links — surfaced on the public "Organized by"
                card as small icon chips. Leave blank to hide. */}
            <Field label="Facebook page" helper="Optional. Paste your page URL or @handle.">
              <Input
                type="url"
                inputMode="url"
                value={form.facebook_url}
                onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
                placeholder="https://facebook.com/yourpage"
              />
            </Field>
            <Field label="Instagram" helper="Optional. Paste your profile URL or @handle.">
              <Input
                type="url"
                inputMode="url"
                value={form.instagram_url}
                onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                placeholder="https://instagram.com/yourhandle"
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

        {/* Witness information — collected at registration (step 2); editable
            here. `phone` is the witness's single mobile/WhatsApp number. */}
        <section className="rounded-xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Witness information</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Details of a witness who can vouch for your organization.
            </p>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Organization witness name">
              <Input
                type="text"
                value={form.witness_name}
                onChange={(e) => setForm({ ...form, witness_name: e.target.value })}
                placeholder="Full name"
                autoComplete="off"
              />
            </Field>
            <Field label="Witness NIC">
              <Input
                type="text"
                value={form.witness_nic}
                onChange={(e) => setForm({ ...form, witness_nic: e.target.value })}
                placeholder="200012345678"
                autoComplete="off"
              />
            </Field>
            <Field label="Email address">
              <Input
                type="email"
                value={form.witness_email}
                onChange={(e) => setForm({ ...form, witness_email: e.target.value })}
                placeholder="witness@example.com"
                autoComplete="off"
              />
            </Field>
            <Field label="Mobile number (WhatsApp)" helper="One number for both calls and WhatsApp.">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+94 77 123 4567"
                autoComplete="tel"
              />
            </Field>
          </div>
        </section>

        {/* Save bar — no bordered wrapper; lives directly in the form flow. */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {saveResult && (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-sm",
              saveResult.tone === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
            )}>
              {saveResult.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {saveResult.text}
            </span>
          )}
          <Button
            type="submit"
            disabled={saving || imageUploading}
            className={cn(
              "transition-colors",
              profileJustSaved && !saving && "bg-emerald-600 text-white hover:bg-emerald-600",
            )}
          >
            {saving ? (
              <Loader className="animate-spin" />
            ) : profileJustSaved ? (
              <CheckCircle2 />
            ) : (
              <Save />
            )}
            {saving ? "Saving…" : profileJustSaved ? "Saved" : "Save profile"}
          </Button>
        </div>
      </form>

      {/* Banking details — separate form because the backend endpoint is
          separate, and a payment-detail change deserves its own commit so
          partial typing in one section doesn't block saves on the other. */}
      <form onSubmit={saveBank} className="space-y-4 rounded-xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5">
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
          <Field label="Branch name">
            <Input
              type="text"
              value={bankForm.branch_name}
              onChange={(e) => setBankForm({ ...bankForm, branch_name: e.target.value })}
              placeholder="Colombo Fort"
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
          <Field label="Bank code" helper="Optional">
            <Input
              type="text"
              value={bankForm.bank_code}
              onChange={(e) => setBankForm({ ...bankForm, bank_code: e.target.value })}
              placeholder="7056"
              autoComplete="off"
            />
          </Field>
          <Field label="Branch code" helper="Optional">
            <Input
              type="text"
              value={bankForm.branch_code}
              onChange={(e) => setBankForm({ ...bankForm, branch_code: e.target.value })}
              placeholder="001"
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
          <Button
            type="submit"
            disabled={bankSaving}
            className={cn(
              "transition-colors",
              bankJustSaved && !bankSaving && "bg-emerald-600 text-white hover:bg-emerald-600",
            )}
          >
            {bankSaving ? (
              <Loader className="animate-spin" />
            ) : bankJustSaved ? (
              <CheckCircle2 />
            ) : (
              <Save />
            )}
            {bankSaving ? "Saving…" : bankJustSaved ? "Saved" : "Save bank details"}
          </Button>
        </div>
      </form>

      {/* Danger zone — voluntary resign-as-organizer flow. Same block as the
          dashboard so the action is reachable from either entry point. Sits
          at the bottom of the profile page after all editable fields. */}
      <ResignDangerZone />
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
