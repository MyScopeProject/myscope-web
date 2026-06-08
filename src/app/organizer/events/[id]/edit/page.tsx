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
  MessageSquare,
  Plus,
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
import { SeatGridPreview, type LayoutData } from "@/components/events/seat-grid-preview"
import { EditSeatMap } from "@/components/events/edit-seat-map"
import {
  VisualSeatMapPreview,
  type VisualPreviewLayout,
  type VisualPreviewSeat,
} from "@/components/events/visual-seat-map-preview"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type ApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled"

interface EventRow {
  id: string
  title: string | null
  description: string | null
  category: string | null
  venue_name: string | null
  venue_address: string | null
  venue_location_url: string | null
  start_time: string | null
  end_time: string | null
  capacity: number | null
  banner_url: string | null
  layout_image_url: string | null
  trailer_url: string | null
  sms_reminders: boolean | null
  seating_mode?: "none" | "free" | "zoned" | "reserved" | null
  approval_status: ApprovalStatus
  rejection_reason: string | null
  // Reserved-seating layout state.
  layout_source?: "grid" | "custom" | "visual" | null
  layout_status?: "ready" | "pending" | null
  layout_request_note?: string | null
}

interface PendingEdit {
  id: string
  event_id: string
  submitted_by: string
  submitted_at: string
  status: "pending" | "approved" | "declined"
  changes: Record<string, unknown>
  decline_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
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
  // Inside a reserved-seating event, marks the tier as GA (quantity-based)
  // rather than per-seat. See migrations/2026-06-09-free-seating-tier.sql.
  is_free_seating?: boolean
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
  const [seatsPreview, setSeatsPreview] = React.useState<LayoutData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState<null | "save" | "submit">(null)
  // Moderation queue surface: a pending edit currently awaiting admin review
  // (one outstanding per event) + the most recent declined edit so we can show
  // the organizer the decline reason on next page load.
  const [pendingEdit, setPendingEdit] = React.useState<PendingEdit | null>(null)
  const [lastDecline, setLastDecline] = React.useState<PendingEdit | null>(null)
  const [savedNotice, setSavedNotice] = React.useState<{ kind: "queued" | "saved"; text: string } | null>(null)

  const [form, setForm] = React.useState({
    title: "",
    description: "",
    category: "",
    venue_name: "",
    venue_address: "",
    venue_location_url: "",
    start_time: "",
    end_time: "",
    capacity: "",
    banner_url: "",
    layout_image_url: "",
    trailer_url: "",
    sms_reminders: true,
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
        setSeatsPreview((data.data.seats_preview as LayoutData | null) ?? null)
        setPendingEdit((data.data.pending_edit as PendingEdit | null) ?? null)
        setLastDecline((data.data.last_decline as PendingEdit | null) ?? null)
        setForm({
          title: e.title ?? "",
          description: e.description ?? "",
          category: e.category ?? "",
          venue_name: e.venue_name ?? "",
          venue_address: e.venue_address ?? "",
          venue_location_url: e.venue_location_url ?? "",
          start_time: isoToLocal(e.start_time),
          end_time: isoToLocal(e.end_time),
          capacity: e.capacity != null ? String(e.capacity) : "",
          banner_url: e.banner_url ?? "",
          layout_image_url: e.layout_image_url ?? "",
          trailer_url: e.trailer_url ?? "",
          sms_reminders: e.sms_reminders ?? true,
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

  // Re-pull the event after a seat map is applied so the preview + tickets refresh.
  const reloadSeats = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${id}`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setSeatsPreview((data.data.seats_preview as LayoutData | null) ?? null)
        setTicketTypes(data.data.ticket_types ?? [])
      }
    } catch {
      /* non-fatal — the apply already succeeded */
    }
  }, [id])

  // Editable statuses match the backend's PATCH gate
  // (organizerEvents.js — `['draft', 'pending', 'approved', 'rejected']`).
  // Pending: organizer fixes typos before admin review.
  // Approved: organizer adjusts date/venue/price on a live event.
  const canEdit =
    !!event && ["draft", "pending", "approved", "rejected"].includes(event.approval_status)

  // Save + (when applicable) submit for review in one flow.
  //
  // The backend PATCH decides per-status what "save" actually means:
  //   - draft / rejected / pending → applies the change immediately
  //   - approved (live event)     → queues the change for admin review,
  //                                  live event untouched (HTTP 202 + queued:true)
  //
  // For draft / rejected we ALSO call POST /:id/submit afterward to flip
  // the event into the admin's review queue. For pending events the row
  // is already in the queue; for approved events the queue is the
  // pending-edits queue (different surface, no submit call needed).
  const handleSaveAndSubmit = async () => {
    if (!event) return
    setError("")
    setSavedNotice(null)

    if (!form.title.trim()) {
      setError("Title is required.")
      return
    }
    if (!form.start_time) {
      setError("Start time is required.")
      return
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
          layout_image_url: form.layout_image_url.trim() || null,
          trailer_url: form.trailer_url.trim() || null,
          sms_reminders: form.sms_reminders,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.message || "Failed to save.")
        return
      }

      // Approved event → backend queued the change instead of applying it.
      // Update the pending-edit banner state and surface a confirmation.
      if (data.queued) {
        if (data.data?.pending_edit) setPendingEdit(data.data.pending_edit as PendingEdit)
        setLastDecline(null) // any prior decline is superseded by this new submission
        setSavedNotice({
          kind: "queued",
          text: data.message || "Submitted for admin review. The live event stays unchanged until they approve.",
        })
        return
      }

      // Direct save path (draft / pending / rejected). For draft + rejected
      // we also need to flip the event into the admin review queue via the
      // /submit endpoint. Pending is already in the queue, so no submit call.
      setEvent(data.data.event)
      const currentStatus = data.data.event?.approval_status ?? event.approval_status
      if (currentStatus === "draft" || currentStatus === "rejected") {
        setBusy("submit")
        const submitRes = await fetch(`${API_URL}/api/organizer/events/${event.id}/submit`, {
          method: "POST",
          credentials: "include",
        })
        const submitBody = await submitRes.json()
        if (!submitBody?.success) {
          setError(submitBody?.message || "Saved, but couldn't submit for review.")
          return
        }
        router.push("/organizer/events")
        return
      }

      setSavedNotice({
        kind: "saved",
        text: "Changes saved.",
      })
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

      {/* Pending review banner — a proposed edit on a live event is sitting
          in the admin queue. Until they approve / decline, the live event
          stays unchanged. */}
      {pendingEdit && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <Send className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Submitted for admin review</div>
            <p className="mt-0.5 text-xs">
              Your proposed changes are pending approval. The live event stays unchanged until an admin approves them.
              Submitted {new Date(pendingEdit.submitted_at).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })}.
            </p>
          </div>
        </div>
      )}

      {/* Most-recent decline — surface the admin's reason so the organizer
          knows what to adjust before re-submitting. Hidden once a new
          pending edit is in flight (the banner above takes precedence). */}
      {!pendingEdit && lastDecline && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Your last change was declined</div>
            {lastDecline.decline_reason ? (
              <p className="mt-0.5 text-xs">
                <span className="font-medium">Reason:</span> {lastDecline.decline_reason}
              </p>
            ) : (
              <p className="mt-0.5 text-xs">No reason provided. Adjust your edits and re-submit.</p>
            )}
          </div>
        </div>
      )}

      {/* Inline confirmation after a successful save / submit. */}
      {savedNotice && (
        <div className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm",
          savedNotice.kind === "queued"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        )}>
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{savedNotice.text}</span>
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
              <select
                id="category"
                aria-label="Event category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <option value="">Pick one…</option>
                <option value="Concerts">Concerts</option>
                <option value="Theatre">Theatre</option>
                <option value="Sports">Sports</option>
                <option value="Events">Events</option>
              </select>
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

          <FieldGroup id="venue_location_url" label="Location URL" hint="Paste a Google Maps link so attendees can find the venue.">
            <Input
              id="venue_location_url"
              type="url"
              value={form.venue_location_url}
              onChange={(e) => setForm({ ...form, venue_location_url: e.target.value })}
              placeholder="https://maps.google.com/..."
            />
          </FieldGroup>

          <BannerUploadField
            value={form.banner_url}
            onChange={(url) => setForm({ ...form, banner_url: url })}
            disabled={!canEdit || busy !== null}
          />

          <BannerUploadField
            label="Seating / zone layout (optional)"
            hint="A venue map showing zones or the seat plan. Shown to attendees on the ticket-selection page."
            value={form.layout_image_url}
            onChange={(url) => setForm({ ...form, layout_image_url: url })}
            disabled={!canEdit || busy !== null}
          />

          <FieldGroup
            id="trailer_url"
            label="YouTube trailer (optional)"
            hint="Paste a YouTube link — watch URL, youtu.be short link, or Shorts. Attendees will see it as a playable video on your event page."
          >
            <Input
              id="trailer_url"
              type="url"
              inputMode="url"
              value={form.trailer_url}
              onChange={(e) => setForm({ ...form, trailer_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
              disabled={!canEdit || busy !== null}
            />
          </FieldGroup>

          <label
            className={cn(
              "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              form.sms_reminders
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                form.sms_reminders ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-foreground">SMS reminders</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                Text attendees a reminder before this event. Turn off to send email-only reminders.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.sms_reminders}
              onChange={(e) => setForm({ ...form, sms_reminders: e.target.checked })}
              aria-label="SMS reminders"
              className="sr-only"
            />
            <span
              className={cn(
                "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                form.sms_reminders ? "bg-primary" : "bg-muted ring-1 ring-border",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                  form.sms_reminders ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </span>
          </label>
        </fieldset>
      </div>

      {/* Seat map (reserved events) */}
      {event.seating_mode === "reserved" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Seat map</h2>
          </div>
          {/* Layout source decides who owns the seat map:
              - "custom" / "visual": admin built it (from uploaded docs or
                via the canvas builder) — organizer view is read-only.
              - "grid" / null: organizer's self-serve grid path. */}
          {event.layout_source === "custom" || event.layout_source === "visual" ? (
            <CustomLayoutPanel event={event} seats={seatsPreview} ticketTypes={ticketTypes} />
          ) : (
            <EditSeatMap
              eventId={event.id}
              ticketTypes={ticketTypes}
              currentSeats={seatsPreview}
              onApplied={reloadSeats}
            />
          )}
        </div>
      )}

      {/* Ticket types editor */}
      <TicketTypesEditor
        eventId={event.id}
        canEdit={!!canEdit}
        tickets={ticketTypes}
        onChange={setTicketTypes}
        seatingMode={event.seating_mode ?? null}
      />

      {/* Footer action — single merged button. For approved events the
          backend queues the change instead of applying it; for draft /
          rejected events the same click saves + submits for admin review
          in one step. The button is disabled while a pending edit is
          already outstanding (organizer should wait for the admin
          decision before submitting another revision). */}
      <div className="flex flex-col items-end gap-2">
        <Button
          type="button"
          onClick={handleSaveAndSubmit}
          disabled={!canEdit || busy !== null || pendingEdit !== null}
        >
          {busy !== null ? <Loader className="animate-spin" /> : <Send />}
          {busy === "submit" ? "Submitting…"
            : busy === "save" ? "Saving…"
            : "Save changes and submit for review"}
        </Button>
        {pendingEdit && (
          <p className="text-xs text-muted-foreground">
            A previous edit is still awaiting admin review. Wait for the decision before submitting another.
          </p>
        )}
      </div>
    </div>
  )
}

function FieldGroup({
  id,
  label,
  required,
  hint,
  children,
}: {
  id?: string
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CustomLayoutPanel — read-only view for reserved events whose seat map is built
// by the MyScope team (either via the canvas builder → layout_source="visual"
// or from organizer-uploaded documents → layout_source="custom"). When seats
// have per-seat (x, y) coords, renders the SVG canvas with TIER colors — same
// visual language buyers see on the consumer seatmap. Booked seats show as
// muted gray, held seats as amber, so the organizer can spot sold sections.
// Falls back to the legacy grid preview for older custom-built maps.
// ---------------------------------------------------------------------------

// Tier palette — must mirror seat-map-picker's TIER_PALETTE so the organizer
// preview reads identically to the buyer-facing seatmap.
const ORGANIZER_TIER_PALETTE = ["#7F77DD", "#1D9E75", "#BA7517", "#D85A30", "#185FA5", "#993556", "#6B7280"]

function CustomLayoutPanel({
  event,
  seats,
  ticketTypes,
}: {
  event: EventRow
  seats: LayoutData | null
  ticketTypes: TicketType[]
}) {
  const [visual, setVisual] = React.useState<{
    layout: VisualPreviewLayout
    seats: VisualPreviewSeat[]
  } | null>(null)
  const [visualLoading, setVisualLoading] = React.useState(true)

  // Pull the canvas seat-map state. The endpoint is admin/organizer-scoped
  // and 200s with empty seats[] for events that haven't had a map built yet.
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizer/events/${event.id}/seat-map`, {
          credentials: "include",
        })
        const data = await res.json()
        if (!cancelled && data?.success && data?.data) {
          setVisual({ layout: data.data.layout, seats: data.data.seats })
        }
      } catch {
        // Best-effort — fall back to the grid preview below if this fails.
      } finally {
        if (!cancelled) setVisualLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [event.id])

  const visualSeatsWithCoords = visual?.seats?.filter(s => s.x != null && s.y != null) ?? []
  const hasVisual = visualSeatsWithCoords.length > 0
  const hasGridSeats = !!seats && seats.sections.length > 0
  const hasAnySeats = hasVisual || hasGridSeats

  // Map ticket_type_id → swatch color. Tiers are indexed in first-seen order
  // matching what the consumer picker does, so seat colors stay consistent
  // between organizer preview and buyer view.
  const tierColorFor = React.useCallback(
    (ticketTypeId: string | null | undefined) => {
      if (!ticketTypeId) return null
      const idx = ticketTypes.findIndex(t => t.id === ticketTypeId)
      if (idx < 0) return null
      return ORGANIZER_TIER_PALETTE[idx % ORGANIZER_TIER_PALETTE.length]
    },
    [ticketTypes],
  )

  return (
    <div className="space-y-4">
      {visualLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4 shrink-0 animate-spin" />
          <span>Loading your seat map…</span>
        </div>
      ) : hasAnySeats ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4 shrink-0" />
            <span>This is the seat map buyers see at checkout.</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-3">
            {hasVisual && visual ? (
              <VisualSeatMapPreview
                layout={visual.layout}
                seats={visualSeatsWithCoords}
                tierColorFor={tierColorFor}
                maxHeightClass="max-h-[70vh]"
              />
            ) : (
              <SeatGridPreview layout={seats!} />
            )}
          </div>
          {/* Tier legend — color swatch + name + price, mirrors the consumer
              seatmap legend so the organizer can map each color back to a tier. */}
          {ticketTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
              {ticketTypes.map((t, i) => (
                <span key={t.id} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: ORGANIZER_TIER_PALETTE[i % ORGANIZER_TIER_PALETTE.length] }}
                  />
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span>· LKR {Number(t.price).toLocaleString()}</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-gray-500" />
                Sold / unavailable
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <Loader className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
          <span>
            Our team is building your seat map from the documents you uploaded. You&rsquo;ll see it here
            once it&rsquo;s ready, and the event goes live after admin approval.
          </span>
        </div>
      )}

      {event.layout_request_note && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your note to our team
          </div>
          <p className="rounded-md bg-muted/40 p-2 text-sm italic text-muted-foreground">
            &ldquo;{event.layout_request_note}&rdquo;
          </p>
        </div>
      )}
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
  label = "Banner image",
  hint,
}: {
  value: string
  onChange: (url: string) => void
  disabled: boolean
  label?: string
  hint?: string
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
          {label}
        </span>
      </span>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

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
          title={`Upload ${label.toLowerCase()}`}
          aria-label={`Upload ${label.toLowerCase()}`}
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

      {value && (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} preview`}
            className="w-full rounded-xl border border-border bg-muted object-contain"
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
  is_active: boolean
  is_free_seating: boolean
}

const emptyDraft = (): TicketDraft => ({
  name: "",
  description: "",
  price: "",
  quantity_total: "",
  per_order_limit: "10",
  is_active: true,
  is_free_seating: false,
})

const fromTicket = (t: TicketType): TicketDraft => ({
  name: t.name,
  description: t.description ?? "",
  price: String(t.price),
  quantity_total: String(t.quantity_total),
  per_order_limit: String(t.per_order_limit),
  is_active: t.is_active,
  is_free_seating: t.is_free_seating === true,
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
      is_active: d.is_active,
      is_free_seating: d.is_free_seating === true,
    },
  }
}

function TicketTypesEditor({
  eventId,
  canEdit,
  tickets,
  onChange,
  seatingMode,
}: {
  eventId: string
  canEdit: boolean
  tickets: TicketType[]
  onChange: (next: TicketType[]) => void
  seatingMode: "none" | "free" | "zoned" | "reserved" | null
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
        // On an APPROVED event the backend returns 202 + queued:true and
        // NO ticket_type (the change is sitting in the admin queue).
        // Skip the local-state push in that case — pushing the missing
        // `ticket_type` would corrupt the array with undefined and the
        // next render's .map(t => t.id) would crash.
        if (data.queued) {
          alert(data.message || "New ticket tier submitted for admin review.")
        } else if (data.data?.ticket_type) {
          onChange([...tickets, data.data.ticket_type as TicketType])
        }
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
        // Same queued-response shape as create above. When queued the
        // live tier is unchanged so we leave the local array alone.
        if (data.queued) {
          alert(data.message || "Ticket tier update submitted for admin review.")
        } else if (data.data?.ticket_type) {
          const updated = data.data.ticket_type as TicketType
          onChange(tickets.map((t) => (t.id === updated.id ? updated : t)))
        }
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
      // Approved-event deletes route through the admin queue — the tier
      // is STILL LIVE until admin approves removal. Don't drop it from
      // the local list; just notify the organizer.
      if (data.queued) {
        alert(data.message || "Ticket tier deletion submitted for admin review.")
      } else {
        onChange(tickets.filter((x) => x.id !== t.id))
      }
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
              seatingMode={seatingMode}
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
            seatingMode={seatingMode}
          />
        )}
      </ul>

      {!canEdit && (
        <p className="mt-3 text-xs text-muted-foreground">
          Ticket types are read-only for this event&rsquo;s current status.
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
  seatingMode,
}: {
  draft: TicketDraft
  setDraft: (d: TicketDraft) => void
  busy: boolean
  onSave: () => void
  onCancel: () => void
  seatingMode: "none" | "free" | "zoned" | "reserved" | null
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
      </div>
      <Input
        type="text"
        placeholder="Description (optional)"
        value={draft.description}
        onChange={(e) => upd({ description: e.target.value })}
      />
      {seatingMode === "reserved" && (
        <label className="flex items-start gap-2 rounded-md border border-border bg-background/40 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.is_free_seating}
            onChange={(e) => upd({ is_free_seating: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium text-foreground">Free seating tier</span>
            <span className="block text-xs text-muted-foreground">
              Sold as general admission — first-come, first-served. Buyers pick a quantity instead of specific seats.
            </span>
          </span>
        </label>
      )}
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
