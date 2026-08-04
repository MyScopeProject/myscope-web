"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Lock,
  Loader,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

function ProfileContent() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = React.useState({ name: "", phone: "", city: "" })
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  React.useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        city: user.city || "",
      })
    }
  }, [user])

  React.useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 3500)
    return () => clearTimeout(t)
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const result = await updateUser(form)
    setLoading(false)
    if (result.success) {
      setMessage({ type: "success", text: "Profile updated successfully." })
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update profile." })
    }
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const initials = (user.name || "U")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information and contact details.
        </p>
      </div>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5">
        <span className="inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name ?? "User"}
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{initials}</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="default" className="capitalize">{user.role}</Badge>
          </div>
        </div>
      </div>

      {/* Flash message */}
      {message && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.type === "success"
            ? <Check className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Account details */}
      <section className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">Account details</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Changes are saved immediately to your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Full name */}
            <EditField
              id="name"
              label="Full name"
              icon={UserIcon}
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Akila Perera"
              required
            />

            {/* Email — read-only */}
            <div className="space-y-1.5">
              <label htmlFor="email-readonly" className="text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email-readonly"
                  type="email"
                  value={user.email || ""}
                  readOnly
                  aria-label="Email address — cannot be changed"
                  className="h-9 w-full rounded-md border border-input bg-muted/50 pl-9 pr-9 text-sm text-muted-foreground cursor-not-allowed focus:outline-none"
                />
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              </div>
            </div>

            {/* Phone */}
            <EditField
              id="phone"
              label="Phone"
              type="tel"
              icon={Phone}
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              placeholder="+94 77 123 4567"
            />

            {/* City */}
            <EditField
              id="city"
              label="City"
              icon={MapPin}
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
              placeholder="Colombo"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? (
                <><Loader className="h-3.5 w-3.5 animate-spin" /> Saving…</>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* Organizer access */}
      {(user.role === "organizer" || user.role === "superadmin") && (
        <section className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-semibold text-foreground">Organizer access</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You have organizer privileges on this account.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Organizer dashboard</p>
                <p className="text-xs text-muted-foreground">
                  Create events, manage tickets, and track payouts.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <a href="https://organizer.myscope.lk" target="_blank" rel="noopener noreferrer">Open</a>
            </Button>
          </div>
        </section>
      )}

      {/* Become organizer CTA — shown only to regular users */}
      {user.role === "user" && (
        <section className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Want to host events?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Apply for organizer access and start selling tickets.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/become-organizer">
                Apply now <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function EditField({
  id,
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string
  label: string
  type?: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
