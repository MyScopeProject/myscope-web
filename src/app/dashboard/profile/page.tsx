"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  Lock,
  Loader,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
} from "lucide-react"
import toast from "react-hot-toast"
import { useAuth } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EditableCard, ViewRow } from "@/components/profile/editable-card"

function ProfileContent() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = React.useState({ name: "", phone: "", city: "" })

  React.useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        city: user.city || "",
      })
    }
  }, [user])

  // Revert the Account details draft to the last-saved values (Cancel).
  const resetAccount = () => {
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
      city: user?.city || "",
    })
  }

  const saveAccount = async (): Promise<boolean> => {
    if (!form.name.trim()) {
      toast.error("Name is required.")
      return false
    }
    const result = await updateUser({
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
    })
    if (result.success) {
      toast.success("Profile updated.")
      return true
    }
    toast.error(result.error || "Failed to update profile.")
    return false
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

      {/* Account details — read-only until the pencil is clicked. */}
      <EditableCard
        title="Account details"
        description="Your personal information and contact details."
        onSave={saveAccount}
        onCancel={resetAccount}
      >
        {(editing) =>
          editing ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <EditField
                id="name"
                label="Full name"
                icon={UserIcon}
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Akila Perera"
                required
              />

              {/* Email stays read-only — changing it isn't supported here. */}
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

              <EditField
                id="phone"
                label="Phone"
                type="tel"
                icon={Phone}
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="+94 77 123 4567"
              />

              <EditField
                id="city"
                label="City"
                icon={MapPin}
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
                placeholder="Colombo"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ViewRow label="Full name" value={user.name} />
              <ViewRow label="Email" value={user.email} />
              <ViewRow label="Phone" value={user.phone} />
              <ViewRow label="City" value={user.city} />
            </div>
          )
        }
      </EditableCard>

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
          className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
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
