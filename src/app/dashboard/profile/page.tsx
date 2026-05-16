"use client"

import * as React from "react"
import Image from "next/image"
import {
  AlertCircle,
  Building2,
  Check,
  Loader,
  Mail,
  MapPin,
  Phone,
  Save,
  User as UserIcon,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function ProfileContent() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    city: "",
  })
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  React.useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        city: user.city || "",
      })
    }
  }, [user])

  // Auto-dismiss flash message
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information and contact details.
        </p>
      </div>

      {/* Identity card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {user.profileImage ? (
              <Image
                src={user.profileImage}
                alt={user.name ?? "User"}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">{initials}</span>
            )}
          </span>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-foreground">{user.name}</div>
            <div className="truncate text-sm text-muted-foreground">{user.email}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant="default" className="capitalize">{user.role}</Badge>
              {user.provider && user.provider !== "local" && (
                <Badge variant="outline" className="capitalize">via {user.provider}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flash */}
      {message && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.type === "success" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Edit form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8"
      >
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground">Account details</h2>
          <p className="text-xs text-muted-foreground">Updates apply immediately to your account.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="name"
            label="Full name"
            icon={UserIcon}
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="Akila Perera"
            required
          />
          <Field
            id="email"
            label="Email"
            type="email"
            icon={Mail}
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="you@example.com"
            required
            helper="Used for login and ticket emails."
          />
          <Field
            id="phone"
            label="Phone"
            type="tel"
            icon={Phone}
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            placeholder="+94 77 123 4567"
          />
          <Field
            id="city"
            label="City"
            icon={MapPin}
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
            placeholder="Colombo"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="submit" disabled={loading}>
            <Save />
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      {/* Organizer block */}
      {(user.role === "organizer" || user.role === "superadmin") && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Organizer access</h2>
              <p className="text-sm text-muted-foreground">
                You can publish events and manage ticket sales.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href="/organizer">Open organizer dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  id,
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  required,
  helper,
}: {
  id: string
  label: string
  type?: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  helper?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="pl-9"
        />
      </div>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
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
