"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Edit3,
  ImageIcon,
  Loader,
  Plus,
  Save,
  Send,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type ApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled"

interface EventRow {
  id: string
  title: string | null
  description: string | null
  category: string | null
  venue_name: string | null
  venue_address: string | null
  start_time: string | null
  end_time: string | null
  capacity: number | null
  banner_url: string | null
  approval_status: ApprovalStatus
  rejection_reason: string | null
}

interface TicketType {
  id: string
  name: string
  description: string | null
  price: number
  quantity_total: number
  quantity_sold: number
  per_order_limit: number
  sale_start: string | null
  sale_end: string | null
  is_active: boolean
}

const STATUS_META: Record<ApprovalStatus, { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  pending: { label: "Under review", variant: "warning" },
  approved: { label: "Live", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
}

// Convert an ISO date string to what `<input type="datetime-local">` expects.
const isoToLocal = (iso: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const localToIso = (v: string) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user, loading: authLoading } = useAuth()

  const [event, setEvent] = React.useState<EventRow | null>(null)
  const [ticketTypes, setTicketTypes] = React.useState<TicketType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState<null | "save" | "submit">(null)

  const [form, setForm] = React.useState({
    title: "",
    description: "",
    category: "",
    venue_name: "",
    venue_address: "",
    start_time: "",
    end_time: "",
    capacity: "",
    banner_url: "",
  })

  // Auth + role guard
  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=/organizer/events/${id}/edit`)
      return
    }
    if (!["organizer", "superadmin"].includes(user.role || "")) {
      router.push("/become-organizer")
    }
  }, [authLoading, user, id, router])

  // Load event
  React.useEffect(() => {
    if (!user || !id) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_URL}/api/organizer/events/${id}`, {
          credentials: "include",
        })
        const data = await res.json()
        if (cancelled) return
        if (!data?.success) {
          setError(data?.message || "Event not found.")
          return
        }
        const e = data.data.event as EventRow
        setEvent(e)
        setTicketTypes(data.data.ticket_types ?? [])
        setForm({
          title: e.title ?? "",
          description: e.description ?? "",
          category: e.category ?? "",
          venue_name: e.venue_name ?? "",
          venue_address: e.venue_address ?? "",
          start_time: isoToLocal(e.start_time),
          end_time: isoToLocal(e.end_time),
          capacity: e.capacity != null ? String(e.capacity) : "",
          banner_url: e.banner_url ?? "",
        })
      } catch {
        if (!cancelled) setError("Network error loading event.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, id])

  const canEdit =
    event?.approval_status === "draft" || event?.approval_status === "rejected"

  const handleSave = async (): Promise<boolean> => {
    if (!event) return false
    setError("")

    if (!form.title.trim()) {
      setError("Title is required.")
      return false
    }
    if (!form.start_time) {
      setError("Start time is required.")
      return false
    }

    setBusy("save")
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${event.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          venue_name: form.venue_name.trim() || null,
          venue_address: form.venue_address.trim() || null,
          start_time: localToIso(form.start_time),
          end_time: localToIso(form.end_time),
          capacity: form.capacity ? parseInt(form.capacity, 10) : null,
          banner_url: form.banner_url.trim() || null,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.message || "Failed to save.")
        return false
      }
      setEvent(data.data.event)
      return true
    } catch {
      setError("Network error. Please try again.")
      return false
    } finally {
      setBusy(null)
    }
  }

  const handleSubmit = async () => {
    if (!event) return
    if (!confirm("Submit for admin review? You won't be able to edit until they respond.")) return
    const saved = await handleSave()
    if (!saved) return

    setBusy("submit")
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${event.id}/submit`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.message || "Failed to submit.")
        return
      }
      router.push("/organizer/events")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="text-sm text-muted-foreground">{error || "Event not found."}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/organizer/events">Back to events</Link>
        </Button>
      </div>
    )
  }

  const status = STATUS_META[event.approval_status]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Edit event</h1>
          <div className="mt-2">
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
      </div>

      {/* Rejection reason */}
      {event.approval_status === "rejected" && event.rejection_reason && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">Rejection reason: </span>
            {event.rejection_reason}
          </div>
        </div>
      )}

      {/* Locked banner */}
      {!canEdit && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This event is <strong>{event.approval_status}</strong> and cannot be edited.
          </span>
        </div>
      )}

      {/* Inline error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Event form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Edit3 className="h-5 w-5 text-primary" />
          Event details
        </h2>

        <fieldset disabled={!canEdit || busy !== null} className="space-y-5">
          <FieldGroup id="title" label="Title" required>
            <Input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Indie Music Night"
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FieldGroup id="category" label="Category">
              <Input
                id="category"
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup id="capacity" label="Capacity">
              <Input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </FieldGroup>
          </div>

          <FieldGroup id="description" label="Description">
            <textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FieldGroup id="start_time" label="Start time" required>
              <Input
                id="start_time"
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup id="end_time" label="End time">
              <Input
                id="end_time"
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </FieldGroup>
          </div>

          <FieldGroup id="venue_name" label="Venue name">
            <Input
              id="venue_name"
              type="text"
              value={form.venue_name}
              onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
            />
          </FieldGroup>

          <FieldGroup id="venue_address" label="Venue address">
            <Input
              id="venue_address"
              type="text"
              value={form.venue_address}
              onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
            />
          </FieldGroup>

          <BannerUploadField
            value={form.banner_url}
            onChange={(url) => setForm({ ...form, banner_url: url })}
            disabled={!canEdit || busy !== null}
          />
        </fieldset>
      </div>

      {/* Ticket types editor */}
      <TicketTypesEditor
        eventId={event.id}
        canEdit={!!canEdit}
        tickets={ticketTypes}
        onChange={setTicketTypes}
      />

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSave}
          disabled={!canEdit || busy !== null}
        >
          {busy === "save" ? <Loader className="animate-spin" /> : <Save />}
          Save changes
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canEdit || busy !== null}
        >
          {busy === "submit" ? <Loader className="animate-spin" /> : <Send />}
          Submit for review
        </Button>
      </div>
    </div>
  )
}

function FieldGroup({
  id,
  label,
  required,
  children,
}: {
  id?: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Banner upload field
// ---------------------------------------------------------------------------

function BannerUploadField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (url: string) => void
  disabled: boolean
}) {
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (PNG, JPG, WebP…).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.")
      return
    }
    setUploadError("")
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch(`${API_URL}/api/organizer/events/upload-banner`, {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.message || "Upload failed.")
      onChange(data.data.url)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4 text-primary" />
          Banner image
        </span>
      </span>

      {/* Drop zone via label so the whole tile triggers the file input */}
      <label
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && uploading && "border-primary/60",
          !disabled && !uploading && "border-border hover:border-primary/40 hover:bg-muted/40",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          title="Upload banner image"
          aria-label="Upload banner image"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
        {uploading ? (
          <div className="flex items-center gap-2">
            <Loader className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Uploading…</span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-primary">Click to upload image</span>
        )}
        <span className="text-xs text-muted-foreground">PNG, JPG, WebP · max 5 MB</span>
      </label>

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste a public image URL…"
        disabled={disabled || uploading}
      />

      {value && (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Banner preview"
            className="aspect-21/9 w-full rounded-xl border border-border object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs font-medium text-destructive hover:underline"
            >
              Remove image
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ticket types editor (inline CRUD)
// ---------------------------------------------------------------------------

interface TicketDraft {
  name: string
  description: string
  price: string
  quantity_total: string
  per_order_limit: string
  sale_start: string
  sale_end: string
  is_active: boolean
}

const emptyDraft = (): TicketDraft => ({
  name: "",
  description: "",
  price: "",
  quantity_total: "",
  per_order_limit: "10",
  sale_start: "",
  sale_end: "",
  is_active: true,
})

const fromTicket = (t: TicketType): TicketDraft => ({
  name: t.name,
  description: t.description ?? "",
  price: String(t.price),
  quantity_total: String(t.quantity_total),
  per_order_limit: String(t.per_order_limit),
  sale_start: isoToLocal(t.sale_start),
  sale_end: isoToLocal(t.sale_end),
  is_active: t.is_active,
})

const validateDraft = (
  d: TicketDraft,
): { error: string } | { ok: true; body: Record<string, unknown> } => {
  const name = d.name.trim()
  if (!name) return { error: "Name is required." }
  const price = Number(d.price)
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be a non-negative number." }
  const qty = parseInt(d.quantity_total, 10)
  if (!Number.isInteger(qty) || qty <= 0) return { error: "Quantity must be a positive integer." }
  const limit = parseInt(d.per_order_limit, 10)
  if (!Number.isInteger(limit) || limit <= 0)
    return { error: "Per-order limit must be a positive integer." }
  return {
    ok: true,
    body: {
      name,
      description: d.description.trim() || null,
      price,
      quantity_total: qty,
      per_order_limit: limit,
      sale_start: localToIso(d.sale_start),
      sale_end: localToIso(d.sale_end),
      is_active: d.is_active,
    },
  }
}

function TicketTypesEditor({
  eventId,
  canEdit,
  tickets,
  onChange,
}: {
  eventId: string
  canEdit: boolean
  tickets: TicketType[]
  onChange: (next: TicketType[]) => void
}) {
  const [editing, setEditing] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<TicketDraft>(emptyDraft())
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")

  const startEdit = (t: TicketType) => {
    setError("")
    setDraft(fromTicket(t))
    setEditing(t.id)
  }

  const startCreate = () => {
    setError("")
    setDraft(emptyDraft())
    setEditing("new")
  }

  const cancel = () => {
    setError("")
    setEditing(null)
  }

  const save = async () => {
    const v = validateDraft(draft)
    if ("error" in v) {
      setError(v.error)
      return
    }
    setBusyId(editing)
    setError("")
    try {
      if (editing === "new") {
        const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/ticket-types`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(v.body),
        })
        const data = await res.json()
        if (!data?.success) {
          setError(data?.message || "Failed to create.")
          return
        }
        onChange([...tickets, data.data.ticket_type as TicketType])
      } else if (editing) {
        const res = await fetch(
          `${API_URL}/api/organizer/events/${eventId}/ticket-types/${editing}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(v.body),
          },
        )
        const data = await res.json()
        if (!data?.success) {
          setError(data?.message || "Failed to save.")
          return
        }
        const updated = data.data.ticket_type as TicketType
        onChange(tickets.map((t) => (t.id === updated.id ? updated : t)))
      }
      setEditing(null)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (t: TicketType) => {
    if (t.quantity_sold > 0) {
      alert("This ticket type has bookings and cannot be deleted.")
      return
    }
    if (!confirm(`Delete ticket type "${t.name}"?`)) return
    setBusyId(t.id)
    setError("")
    try {
      const res = await fetch(
        `${API_URL}/api/organizer/events/${eventId}/ticket-types/${t.id}`,
        { method: "DELETE", credentials: "include" },
      )
      const data = await res.json()
      if (!data?.success) {
        setError(data?.message || "Failed to delete.")
        return
      }
      onChange(tickets.filter((x) => x.id !== t.id))
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Tag className="h-5 w-5 text-primary" />
          Ticket types
        </h2>
        {canEdit && editing !== "new" && (
          <Button type="button" variant="outline" size="sm" onClick={startCreate} disabled={busyId !== null}>
            <Plus /> Add
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {tickets.length === 0 && editing !== "new" && (
        <p className="text-sm text-muted-foreground">
          No ticket types yet.{canEdit ? ' Click "Add" to create one.' : ""}
        </p>
      )}

      <ul className="space-y-2">
        {tickets.map((t) =>
          editing === t.id ? (
            <DraftRow
              key={t.id}
              draft={draft}
              setDraft={setDraft}
              busy={busyId === t.id}
              onSave={save}
              onCancel={cancel}
            />
          ) : (
            <DisplayRow
              key={t.id}
              ticket={t}
              canEdit={canEdit && editing === null}
              busy={busyId === t.id}
              onEdit={() => startEdit(t)}
              onDelete={() => remove(t)}
            />
          ),
        )}
        {editing === "new" && (
          <DraftRow
            draft={draft}
            setDraft={setDraft}
            busy={busyId === "new"}
            onSave={save}
            onCancel={cancel}
          />
        )}
      </ul>

      {!canEdit && (
        <p className="mt-3 text-xs text-muted-foreground">
          Ticket types are read-only while the event is not in draft/rejected state.
        </p>
      )}
    </div>
  )
}

function DisplayRow({
  ticket,
  canEdit,
  busy,
  onEdit,
  onDelete,
}: {
  ticket: TicketType
  canEdit: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3">
      <div className="min-w-0">
        <div className="font-semibold text-foreground">{ticket.name}</div>
        <div className="text-xs text-muted-foreground">
          LKR {ticket.price} · {ticket.quantity_sold}/{ticket.quantity_total} sold · max{" "}
          {ticket.per_order_limit}/order
          {!ticket.is_active && " · inactive"}
        </div>
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            disabled={busy}
            aria-label="Edit ticket type"
          >
            <Edit3 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            disabled={busy || ticket.quantity_sold > 0}
            aria-label={ticket.quantity_sold > 0 ? "Cannot delete — has bookings" : "Delete"}
            className="text-destructive hover:bg-destructive/10"
          >
            {busy ? <Loader className="animate-spin" /> : <Trash2 />}
          </Button>
        </div>
      )}
    </li>
  )
}

function DraftRow({
  draft,
  setDraft,
  busy,
  onSave,
  onCancel,
}: {
  draft: TicketDraft
  setDraft: (d: TicketDraft) => void
  busy: boolean
  onSave: () => void
  onCancel: () => void
}) {
  const upd = (patch: Partial<TicketDraft>) => setDraft({ ...draft, ...patch })

  return (
    <li className="space-y-3 rounded-xl border border-primary/40 bg-background/60 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          type="text"
          placeholder="Name (e.g. VIP)"
          value={draft.name}
          onChange={(e) => upd({ name: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="Price (LKR)"
          value={draft.price}
          onChange={(e) => upd({ price: e.target.value })}
        />
        <Input
          type="number"
          min={1}
          placeholder="Total quantity"
          value={draft.quantity_total}
          onChange={(e) => upd({ quantity_total: e.target.value })}
        />
        <Input
          type="number"
          min={1}
          placeholder="Per-order limit"
          value={draft.per_order_limit}
          onChange={(e) => upd({ per_order_limit: e.target.value })}
        />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sale start (optional)</label>
          <Input
            type="datetime-local"
            value={draft.sale_start}
            onChange={(e) => upd({ sale_start: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sale end (optional)</label>
          <Input
            type="datetime-local"
            value={draft.sale_end}
            onChange={(e) => upd({ sale_end: e.target.value })}
          />
        </div>
      </div>
      <Input
        type="text"
        placeholder="Description (optional)"
        value={draft.description}
        onChange={(e) => upd({ description: e.target.value })}
      />
      <div className="flex items-center justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => upd({ is_active: e.target.checked })}
            className="accent-primary"
          />
          Active
        </label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            <X /> Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={busy}>
            {busy ? <Loader className="animate-spin" /> : <Check />}
            Save
          </Button>
        </div>
      </div>
    </li>
  )
}
