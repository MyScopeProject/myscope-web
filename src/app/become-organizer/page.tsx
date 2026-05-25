"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
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
  phone: string | null
  profile_image_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  branch_name: string | null
  bank_code: string | null
  branch_code: string | null
  verification_status: VerificationStatus
  rejection_reason: string | null
  created_at: string
  updated_at?: string
}

// Bank/payout fields are intentionally omitted here — organizers fill them in
// from the dashboard after approval. Keeps the application form short.
const emptyForm = {
  business_name: "",
  business_type: "company",
  nic_or_br: "",
  phone: "",
  profile_image_url: "",
}

export default function BecomeOrganizerPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [profile, setProfile] = React.useState<OrganizerProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = React.useState(true)
  const [form, setForm] = React.useState(emptyForm)
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
          if (p && p.verification_status === "rejected") {
            setForm({
              business_name: p.business_name,
              business_type: p.business_type ?? "company",
              nic_or_br: p.nic_or_br ?? "",
              phone: p.phone ?? "",
              profile_image_url: p.profile_image_url ?? "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.business_name.trim()) {
      setError("Business name is required.")
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

  const showForm = !profile || profile.verification_status === "rejected"

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
      {profile?.verification_status === "approved" && (
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
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                      "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
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
                required
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

            {/* WhatsApp — primary contact channel for organizers in SL */}
            <Field label="WhatsApp number" htmlFor="phone">
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+94 77 123 4567"
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Attendees will use this to reach you about bookings.
              </p>
            </Field>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
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
          </form>
        </div>
      )}
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"

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
  const styles = {
    success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
  }[tone]

  return (
    <div className={cn("mb-6 rounded-xl border p-5", styles)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed opacity-80">{body}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
