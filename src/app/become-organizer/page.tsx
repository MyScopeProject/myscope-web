"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  Loader,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type VerificationStatus = "pending" | "approved" | "rejected"

interface OrganizerProfile {
  id: string
  business_name: string
  business_type: string | null
  nic_or_br: string | null
  phone: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  verification_status: VerificationStatus
  rejection_reason: string | null
  created_at: string
  updated_at?: string
}

const emptyForm = {
  business_name: "",
  business_type: "company",
  nic_or_br: "",
  phone: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_name: "",
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
              bank_name: p.bank_name ?? "",
              bank_account_number: p.bank_account_number ?? "",
              bank_account_name: p.bank_account_name ?? "",
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
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Building2 className="h-7 w-7" />
        </span>
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

            {/* Phone */}
            <Field label="Contact phone" htmlFor="phone">
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+94 77 123 4567"
                className={inputCls}
              />
            </Field>

            {/* Bank section */}
            <div className="border-t border-border pt-5">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Payout bank details</h3>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                We&rsquo;ll use this account to pay out your event revenue. You can add it later.
              </p>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Bank" htmlFor="bank_name">
                  <input
                    id="bank_name"
                    type="text"
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    placeholder="Bank of Ceylon"
                    className={inputCls}
                  />
                </Field>

                <Field label="Account number" htmlFor="bank_account_number">
                  <input
                    id="bank_account_number"
                    type="text"
                    value={form.bank_account_number}
                    onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                    placeholder="1234567890"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="mt-5">
                <Field label="Account holder name" htmlFor="bank_account_name">
                  <input
                    id="bank_account_name"
                    type="text"
                    value={form.bank_account_name}
                    onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                    placeholder="Acme Events Pvt Ltd"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

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
