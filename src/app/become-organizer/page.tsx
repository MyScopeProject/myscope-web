"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  ImageIcon,
  Loader,
  Upload,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type VerificationStatus = "pending" | "approved" | "rejected"

interface OrganizerProfile {
  id: string
  business_name: string
  business_type: string | null
  nic_or_br: string | null
  // `phone` holds the witness's single mobile/WhatsApp number (the organizer's
  // own contact field was removed from registration). Other witness fields below.
  phone: string | null
  witness_name: string | null
  witness_nic: string | null
  witness_email: string | null
  profile_image_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  branch_name: string | null
  bank_code: string | null
  branch_code: string | null
  // Optional social links displayed on the public "Organized by" card.
  facebook_url: string | null
  instagram_url: string | null
  verification_status: VerificationStatus
  rejection_reason: string | null
  // Set when the organizer resigned or was revoked by an admin. Stays
  // 'approved' forever on verification_status (a historical record), so this
  // is the real signal that re-application should be offered again.
  deactivated_at: string | null
  created_at: string
  updated_at?: string
}

// Bank/payout fields are intentionally omitted here — organizers fill them in
// from the dashboard after approval. Keeps the application form short.
// `phone` is the witness's single mobile/WhatsApp number (see OrganizerProfile above).
const emptyForm = {
  business_name: "",
  business_type: "company",
  nic_or_br: "",
  profile_image_url: "",
  facebook_url: "",
  instagram_url: "",
  witness_name: "",
  witness_nic: "",
  witness_email: "",
  phone: "",
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function BecomeOrganizerPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [profile, setProfile] = React.useState<OrganizerProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = React.useState(true)
  const [form, setForm] = React.useState(emptyForm)
  const [step, setStep] = React.useState<1 | 2>(1)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, WebP…).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.")
      return
    }
    setError("")
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch(`${API_URL}/api/organizers/upload-profile-image`, {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.message || "Upload failed.")
      setForm((f) => ({ ...f, profile_image_url: data.data.url }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploadingImage(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login?redirect=/become-organizer")
    }
  }, [authLoading, user, router])

  React.useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizers/me`, { credentials: "include" })
        const data = await res.json()
        if (cancelled) return
        if (data?.success) {
          const p: OrganizerProfile | null = data.data?.profile ?? null
          setProfile(p)
          if (p && (p.verification_status === "rejected" || p.deactivated_at)) {
            setForm({
              business_name: p.business_name,
              business_type: p.business_type ?? "company",
              nic_or_br: p.nic_or_br ?? "",
              profile_image_url: p.profile_image_url ?? "",
              facebook_url: p.facebook_url ?? "",
              instagram_url: p.instagram_url ?? "",
              witness_name: p.witness_name ?? "",
              witness_nic: p.witness_nic ?? "",
              witness_email: p.witness_email ?? "",
              phone: p.phone ?? "",
            })
          }
        }
      } finally {
        if (!cancelled) setLoadingProfile(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  // Step 1 → 2 gate. Business name is the only required field in step 1
  // (type defaults to company; image and NIC are optional).
  const goToStep2 = () => {
    setError("")
    if (!form.business_name.trim()) {
      setError("Business / organization name is required.")
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.business_name.trim()) {
      setStep(1)
      setError("Business / organization name is required.")
      return
    }

    // All witness fields are mandatory.
    if (
      !form.witness_name.trim() ||
      !form.witness_nic.trim() ||
      !form.witness_email.trim() ||
      !form.phone.trim()
    ) {
      setError("All witness fields are required.")
      return
    }
    if (!EMAIL_RE.test(form.witness_email.trim())) {
      setError("Enter a valid witness email address.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/organizers/apply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (data?.success) {
        setProfile(data.data?.profile ?? null)
        setSuccess(data.message || "Application submitted.")
      } else {
        if (data?.data?.profile) setProfile(data.data.profile)
        setError(data?.message || "Submission failed.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const showForm = !profile || profile.verification_status === "rejected" || !!profile.deactivated_at

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center">
          <Image
            src="/Images/logo.png"
            alt="MyScope"
            width={240}
            height={72}
            className="h-20 w-auto object-contain"
            priority
          />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Become an Organizer
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apply once. Our team reviews every application to keep MyScope trustworthy.
        </p>
      </div>

      {/* Status banners */}
      {profile?.verification_status === "approved" && !profile.deactivated_at && (
        <StatusBanner
          tone="success"
          icon={CheckCircle}
          title="You're an approved organizer"
          body="You can now create events and access the organizer dashboard."
        >
          <Button asChild size="sm" className="mt-4">
            <Link href="/organizer">Go to organizer dashboard</Link>
          </Button>
        </StatusBanner>
      )}

      {profile?.deactivated_at && (
        <StatusBanner
          tone="destructive"
          icon={XCircle}
          title="You're no longer an active organizer"
          body="You resigned (or your organizer status was revoked). Update your details and re-submit below to apply again."
        />
      )}

      {profile?.verification_status === "pending" && (
        <StatusBanner
          tone="warning"
          icon={Clock}
          title="Application under review"
          body={`We received your application for "${profile.business_name}". Admins typically respond within 24 hours.`}
        />
      )}

      {profile?.verification_status === "rejected" && (
        <StatusBanner
          tone="destructive"
          icon={XCircle}
          title="Application was not approved"
          body={
            profile.rejection_reason ||
            "No reason was provided. Update your details and re-submit below."
          }
        />
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-6 shadow-xs sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm font-bold text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step indicator */}
            <ol className="flex items-center gap-3 text-xs font-medium">
              {[
                { n: 1, label: "Business details" },
                { n: 2, label: "Witness information" },
              ].map((s, i) => (
                <React.Fragment key={s.n}>
                  <li className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                        step === s.n
                          ? "border-primary bg-primary text-primary-foreground"
                          : step > s.n
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
                    </span>
                    <span className={cn(step === s.n ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </li>
                  {i === 0 && <li className="h-px w-6 flex-none bg-border sm:w-10" aria-hidden />}
                </React.Fragment>
              ))}
            </ol>

            {/* Step 1 — Business / organization details */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Profile image — circular avatar uploader. Shown on event pages
                    as the organizer's brand image, so encourage a logo. */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Profile image
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-muted-foreground">
                      {form.profile_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.profile_image_url}
                          alt="Organizer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-7 w-7" />
                      )}
                    </span>
                    <div className="flex-1">
                      <label
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
                          uploadingImage && "pointer-events-none opacity-60",
                        )}
                      >
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          title="Upload organizer profile image"
                        />
                        {uploadingImage ? (
                          <>
                            <Loader className="h-3.5 w-3.5 animate-spin" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            {form.profile_image_url ? "Replace image" : "Upload image"}
                          </>
                        )}
                      </label>
                      {form.profile_image_url && !uploadingImage && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, profile_image_url: "" })}
                          className="ml-2 text-xs text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </button>
                      )}
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        PNG, JPG, or WebP — under 5 MB. Use your brand logo if you have one.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business name */}
                <Field label="Business / organization name" htmlFor="business_name" required>
                  <input
                    id="business_name"
                    type="text"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    placeholder="Acme Events"
                    className={inputCls}
                  />
                </Field>

                {/* Type + NIC */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Business type" htmlFor="business_type">
                    <select
                      id="business_type"
                      title="Business type"
                      value={form.business_type}
                      onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                      className={inputCls}
                    >
                      <option value="individual">Individual</option>
                      <option value="company">Company</option>
                      <option value="ngo">NGO</option>
                    </select>
                  </Field>

                  <Field label="NIC or Business Reg. no." htmlFor="nic_or_br">
                    <input
                      id="nic_or_br"
                      type="text"
                      value={form.nic_or_br}
                      onChange={(e) => setForm({ ...form, nic_or_br: e.target.value })}
                      placeholder="PV 12345"
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Optional social-media links — surfaced on the public
                    "Organized by" card so attendees can verify + follow. */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Facebook page (optional)" htmlFor="facebook_url">
                    <input
                      id="facebook_url"
                      type="url"
                      inputMode="url"
                      value={form.facebook_url}
                      onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
                      placeholder="https://facebook.com/yourpage"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Instagram (optional)" htmlFor="instagram_url">
                    <input
                      id="instagram_url"
                      type="url"
                      inputMode="url"
                      value={form.instagram_url}
                      onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/yourhandle"
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Button type="button" className="w-full" size="lg" onClick={goToStep2}>
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2 — Witness information */}
            {step === 2 && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Provide the details of a witness who can vouch for your organization. All fields are required.
                </p>

                <Field label="Organization Witness Name" htmlFor="witness_name" required>
                  <input
                    id="witness_name"
                    type="text"
                    value={form.witness_name}
                    onChange={(e) => setForm({ ...form, witness_name: e.target.value })}
                    placeholder="Full name"
                    className={inputCls}
                  />
                </Field>

                <Field label="Witness NIC" htmlFor="witness_nic" required>
                  <input
                    id="witness_nic"
                    type="text"
                    value={form.witness_nic}
                    onChange={(e) => setForm({ ...form, witness_nic: e.target.value })}
                    placeholder="200012345678"
                    className={inputCls}
                  />
                </Field>

                <Field label="Email Address" htmlFor="witness_email" required>
                  <input
                    id="witness_email"
                    type="email"
                    value={form.witness_email}
                    onChange={(e) => setForm({ ...form, witness_email: e.target.value })}
                    placeholder="witness@example.com"
                    className={inputCls}
                  />
                </Field>

                <Field label="Mobile Number (WhatsApp)" htmlFor="phone" required>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    One number for both calls and WhatsApp.
                  </p>
                </Field>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setStep(1)
                      setError("")
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" className="sm:flex-1" size="lg" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : profile?.verification_status === "rejected" ? (
                      "Re-submit application"
                    ) : (
                      "Submit application"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-input bg-transparent dark:bg-input/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function StatusBanner({
  tone,
  icon: Icon,
  title,
  body,
  children,
}: {
  tone: "success" | "warning" | "destructive"
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  children?: React.ReactNode
}) {
  // Success intentionally matches the site's normal card treatment (no green
  // fill/border) — only the icon keeps a small color accent so the "approved"
  // signal is still immediately readable at a glance.
  const styles = {
    success: "border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm text-foreground",
    warning: "border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm text-foreground",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
  }[tone]
  const iconStyles =
    tone === "success" ? "text-emerald-600 dark:text-emerald-400" :
    tone === "warning" ? "text-amber-600 dark:text-amber-400" : ""

  return (
    <div className={cn("mb-6 rounded-2xl border p-5 shadow-xs", styles)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconStyles)} />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed opacity-80">{body}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
