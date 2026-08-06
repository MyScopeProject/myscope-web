"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Clock,
  ImagePlus,
  Landmark,
  Loader,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import toast from "react-hot-toast"
import { useOrganizerGuard } from "@/hooks/useOrganizerGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EditableCard, ViewRow } from "@/components/profile/editable-card"
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
  // Only the brand-image uploader keeps a busy flag now — every editable card
  // owns its own saving state (see EditableCard).
  const [imageUploading, setImageUploading] = React.useState(false)

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

  // Persist a brand-image change to the profile immediately (upload success or
  // "remove"), so the image section is self-contained — no separate Save step.
  const persistImage = async (url: string | null) => {
    try {
      const res = await fetch(`${API_URL}/api/organizers/me/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_image_url: url }),
      })
      const body = await res.json()
      if (body?.success) {
        setProfile(body.data?.profile ?? null)
        setForm((prev) => ({ ...prev, profile_image_url: url ?? "" }))
        toast.success(url ? "Brand image updated." : "Brand image removed.")
      } else {
        toast.error(body?.message || "Failed to update image.")
      }
    } catch {
      toast.error("Network error updating image.")
    }
  }

  const handleImagePick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.")
      return
    }
    setImageUploading(true)
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
        toast.error(body?.message || "Upload failed.")
        return
      }
      await persistImage(body.data?.url ?? "")
    } catch {
      toast.error("Network error uploading image.")
    } finally {
      setImageUploading(false)
    }
  }

  // ── Per-section saves. Each PATCHes only its own fields (the endpoints are
  // partial), so editing several cards at once never cross-contaminates. Each
  // resolves true on success so its EditableCard leaves edit mode.

  const saveBusiness = async (): Promise<boolean> => {
    if (!form.business_name.trim()) {
      toast.error("Business name is required.")
      return false
    }
    try {
      const res = await fetch(`${API_URL}/api/organizers/me/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: form.business_name.trim(),
          business_type: form.business_type || null,
          facebook_url: form.facebook_url.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
        }),
      })
      const body = await res.json()
      if (body?.success) {
        setProfile(body.data?.profile ?? null)
        toast.success("Business details saved.")
        return true
      }
      toast.error(body?.message || "Save failed.")
      return false
    } catch {
      toast.error("Network error saving profile.")
      return false
    }
  }

  const saveWitness = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/organizers/me/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          witness_name: form.witness_name.trim() || null,
          witness_nic: form.witness_nic.trim() || null,
          witness_email: form.witness_email.trim() || null,
          phone: form.phone.trim() || null,
        }),
      })
      const body = await res.json()
      if (body?.success) {
        setProfile(body.data?.profile ?? null)
        toast.success("Witness information saved.")
        return true
      }
      toast.error(body?.message || "Save failed.")
      return false
    } catch {
      toast.error("Network error saving witness details.")
      return false
    }
  }

  const saveBank = async (): Promise<boolean> => {
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
      toast.error("Fill bank, branch, account name and account number, or leave them all blank.")
      return false
    }
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
      if (body?.success) {
        setProfile(body.data?.profile ?? null)
        toast.success("Bank details saved.")
        return true
      }
      toast.error(body?.message || "Save failed.")
      return false
    } catch {
      toast.error("Network error saving bank details.")
      return false
    }
  }

  // Cancel handlers — revert each section's draft to the last-saved profile.
  const resetBusiness = () =>
    setForm((f) => ({
      ...f,
      business_name: profile?.business_name ?? "",
      business_type: (profile?.business_type ?? "") as "" | NonNullable<BusinessType>,
      facebook_url: profile?.facebook_url ?? "",
      instagram_url: profile?.instagram_url ?? "",
    }))

  const resetWitness = () =>
    setForm((f) => ({
      ...f,
      witness_name: profile?.witness_name ?? "",
      witness_nic: profile?.witness_nic ?? "",
      witness_email: profile?.witness_email ?? "",
      phone: profile?.phone ?? "",
    }))

  const resetBank = () =>
    setBankForm({
      bank_name: profile?.bank_name ?? "",
      bank_account_number: profile?.bank_account_number ?? "",
      bank_account_name: profile?.bank_account_name ?? "",
      branch_name: profile?.branch_name ?? "",
      bank_code: profile?.bank_code ?? "",
      branch_code: profile?.branch_code ?? "",
    })

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

      {/* Brand image — self-contained: uploading or removing persists
          immediately (no separate Save step), so it's a plain section rather
          than an editable card. */}
      <section className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-6">
        <header className="mb-4">
          <h2 className="font-semibold text-foreground">Brand image</h2>
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
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-xs font-medium hover:bg-muted",
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
                onClick={() => persistImage(null)}
                disabled={imageUploading}
                className="block text-xs text-destructive hover:underline disabled:opacity-60"
              >
                Remove image
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Business details */}
      <EditableCard
        title="Business details"
        description="Attendees see your business name on every event you publish."
        saveLabel="Save details"
        onSave={saveBusiness}
        onCancel={resetBusiness}
      >
        {(editing) => (
          <>
            {editing ? (
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
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ViewRow label="Business name" value={profile.business_name} />
                <ViewRow
                  label="Business type"
                  value={profile.business_type ? BUSINESS_TYPE_LABEL[profile.business_type] : ""}
                />
                <ViewRow label="Facebook page" value={profile.facebook_url} />
                <ViewRow label="Instagram" value={profile.instagram_url} />
              </div>
            )}

            {/* Read-only context — never editable, shown in both modes. */}
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
              {profile.nic_or_br && <ReadonlyRow label="NIC / BR" value={profile.nic_or_br} />}
              <ReadonlyRow label="Member since" value={new Date(profile.created_at).toLocaleDateString()} />
              {profile.deactivated_at && (
                <ReadonlyRow
                  label="Deactivated"
                  value={new Date(profile.deactivated_at).toLocaleDateString()}
                />
              )}
            </div>
          </>
        )}
      </EditableCard>

      {/* Witness information — collected at registration (step 2); editable
          here. `phone` is the witness's single mobile/WhatsApp number. */}
      <EditableCard
        title="Witness information"
        description="Details of a witness who can vouch for your organization."
        saveLabel="Save details"
        onSave={saveWitness}
        onCancel={resetWitness}
      >
        {(editing) =>
          editing ? (
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
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ViewRow label="Organization witness name" value={profile.witness_name} />
              <ViewRow label="Witness NIC" value={profile.witness_nic} />
              <ViewRow label="Email address" value={profile.witness_email} />
              <ViewRow label="Mobile number (WhatsApp)" value={profile.phone} />
            </div>
          )
        }
      </EditableCard>

      {/* Banking details — its own PATCH endpoint; a payment-detail change
          deserves its own commit. */}
      <EditableCard
        title="Banking details"
        icon={Landmark}
        saveLabel="Save bank details"
        onSave={saveBank}
        onCancel={resetBank}
      >
        {(editing) =>
          editing ? (
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
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ViewRow label="Bank name" value={profile.bank_name} />
              <ViewRow label="Branch name" value={profile.branch_name} />
              <ViewRow label="Account holder name" value={profile.bank_account_name} />
              <ViewRow label="Account number" value={profile.bank_account_number} />
              <ViewRow label="Bank code" value={profile.bank_code} />
              <ViewRow label="Branch code" value={profile.branch_code} />
            </div>
          )
        }
      </EditableCard>

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
