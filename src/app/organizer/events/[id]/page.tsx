"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import {
  AlertCircle,
  ArrowLeft,
  BarChart2,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Loader,
  Copy,
  Mail,
  MapPin,
  PauseCircle,
  PlayCircle,
  QrCode,
  RefreshCw,
  Send,
  Tag,
  Ticket,
  Trash2,
  Users as UsersIcon,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ---------------------------------------------------------------------------
// Types — kept minimal; only what each tab actually consumes.
// ---------------------------------------------------------------------------

type ApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled"

interface EventDetail {
  id: string
  title: string
  description?: string | null
  category?: string | null
  venue_name?: string | null
  start_time?: string | null
  date?: string | null
  banner_url?: string | null
  approval_status: ApprovalStatus
  seating_mode?: string | null
}

interface TicketType {
  id: string
  name: string
  price: number | string
  quantity_total: number
  quantity_sold: number
  per_order_limit?: number
  is_active?: boolean
}

interface BookingRow {
  id: string
  booking_reference: string
  short_code?: string | null
  status: string
  payment_status: string
  number_of_tickets: number
  total_amount: number | string
  discount_amount?: number | string | null
  attendee_info?: { name?: string; email?: string; phone?: string } | null
  guest_email?: string | null
  guest_name?: string | null
  checked_in_at?: string | null
  created_at: string
  ticket_type_id?: string | null
}

interface PromoCode {
  id: string
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number | string
  max_uses: number | null
  used_count: number
  min_total: number | string | null
  valid_from: string | null
  valid_until: string | null
  active: boolean
  created_at: string
}

interface WaitlistEntry {
  id: string
  email: string
  name: string | null
  phone: string | null
  requested_quantity: number
  notified_at: string | null
  created_at: string
}

interface CheckinStatus {
  totals: {
    bookings: number
    checked_in_bookings: number
    tickets: number
    checked_in_tickets: number
    checked_in_pct: number
  }
  recent: Array<{
    id: string
    booking_reference: string
    name: string | null
    number_of_tickets: number
    checked_in_at: string | null
  }>
}

type Tab =
  | "overview"
  | "tickets"
  | "attendees"
  | "checkin"
  | "scanners"
  | "promo"
  | "waitlist"
  | "comms"

const TABS: Array<{ value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "overview",  label: "Overview",   icon: BarChart2 },
  { value: "tickets",   label: "Tickets",    icon: Ticket },
  { value: "attendees", label: "Attendees",  icon: UsersIcon },
  { value: "checkin",   label: "Check-in",   icon: ClipboardList },
  { value: "scanners",  label: "Scanners",   icon: QrCode },
  { value: "promo",     label: "Promo codes", icon: Tag },
  { value: "waitlist",  label: "Waitlist",   icon: Bell },
  { value: "comms",     label: "Comms",      icon: Mail },
]

const STATUS_VARIANT: Record<ApprovalStatus, "default" | "warning" | "success" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "outline",
}

const formatLkr = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? Number(n) : (n ?? 0)
  return `LKR ${(v || 0).toLocaleString()}`
}

const formatWhen = (iso?: string | null) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  })
}

// ===========================================================================
// Top-level page
// ===========================================================================

export default function OrganizerEventControlPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const eventId = params?.id
  const { user, loading: authLoading } = useAuth()

  const [event, setEvent] = React.useState<EventDetail | null>(null)
  // Ticket types are loaded at the parent because the header needs them to
  // derive sales-paused state, and the Tickets tab consumes them too.
  const [tickets, setTickets] = React.useState<TicketType[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [tab, setTab] = React.useState<Tab>("overview")
  // Header-action busy flags (one at a time is fine).
  const [headerBusy, setHeaderBusy] = React.useState<null | "pause" | "resume" | "cancel">(null)
  const [headerMsg, setHeaderMsg] = React.useState<{ text: string; tone: "ok" | "err" } | null>(null)

  // Auth + role guard.
  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=/organizer/events/${eventId}`)
      return
    }
    if (!["organizer", "superadmin"].includes(user.role || "")) {
      router.push("/become-organizer")
    }
  }, [authLoading, user, eventId, router])

  const fetchEvent = React.useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      // Parallel: event + ticket types. The /:id endpoint returns both today
      // but we keep ticket types in their own state so refresh-after-edit
      // doesn't reload the whole event payload.
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setEvent(data.data?.event ?? null)
        setTickets((data.data?.ticket_types ?? []) as TicketType[])
      } else {
        setError(data?.message || "Couldn't load event.")
      }
    } catch {
      setError("Network error loading event.")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  const refreshTickets = React.useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/ticket-types`, { credentials: "include" })
      const body = await res.json()
      if (body?.success) setTickets((body.data?.ticket_types ?? []) as TicketType[])
    } catch { /* tickets stay stale, header just shows wrong state for a tick */ }
  }, [eventId])

  // Sales are "paused" only when EVERY ticket type is inactive. If even one
  // tier is selling, we're live. Empty list = not paused (defensive default).
  const salesPaused = !!tickets && tickets.length > 0 && tickets.every(t => t.is_active === false)

  const toggleSales = async (resume: boolean) => {
    if (!eventId) return
    setHeaderBusy(resume ? "resume" : "pause")
    setHeaderMsg(null)
    try {
      const path = resume ? "resume-sales" : "pause-sales"
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/${path}`, {
        method: "POST",
        credentials: "include",
      })
      const body = await res.json()
      setHeaderMsg({
        text: body?.message || (body?.success ? "Updated." : "Failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) await refreshTickets()
    } catch {
      setHeaderMsg({ text: "Network error.", tone: "err" })
    } finally {
      setHeaderBusy(null)
    }
  }

  const cancelEvent = async () => {
    if (!eventId) return
    const reason = window.prompt(
      "Cancel this event?\n\nAll confirmed bookings will be queued for refund and attendees will receive a cancellation email.\n\nOptional reason:",
      "",
    )
    if (reason === null) return
    setHeaderBusy("cancel")
    setHeaderMsg(null)
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      const body = await res.json()
      setHeaderMsg({
        text: body?.message || (body?.success ? "Cancelled." : "Failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) await fetchEvent()
    } catch {
      setHeaderMsg({ text: "Network error.", tone: "err" })
    } finally {
      setHeaderBusy(null)
    }
  }

  React.useEffect(() => {
    if (user && ["organizer", "superadmin"].includes(user.role || "")) {
      fetchEvent()
    }
  }, [user, fetchEvent])

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to events
        </Link>
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error || "Event not found."}</span>
        </div>
      </div>
    )
  }

  const when = event.start_time || event.date
  // Edit gate matches the backend's widened PATCH gate.
  const canEdit = ["draft", "pending", "approved", "rejected"].includes(event.approval_status)

  return (
    <div className="space-y-6">
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[event.approval_status]}>
              {event.approval_status === "approved" ? "Live" : event.approval_status}
            </Badge>
            {event.seating_mode && event.seating_mode !== "none" && (
              <Badge variant="outline">{event.seating_mode}</Badge>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {event.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {when && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {formatWhen(when)}
              </span>
            )}
            {event.venue_name && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {event.venue_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/organizer/events/${eventId}/edit`}>
                <Edit3 /> Edit event
              </Link>
            </Button>
          )}
          {/* Live-event controls — pause/resume sales + cancel. Only visible
              for approved events; everything else is too early or too late
              for these actions to make sense. */}
          {event.approval_status === "approved" && (
            <>
              {salesPaused ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSales(true)}
                  disabled={headerBusy !== null}
                >
                  {headerBusy === "resume" ? <Loader className="animate-spin" /> : <PlayCircle />}
                  Resume sales
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSales(false)}
                  disabled={headerBusy !== null}
                >
                  {headerBusy === "pause" ? <Loader className="animate-spin" /> : <PauseCircle />}
                  Pause sales
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEvent}
                disabled={headerBusy !== null}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                {headerBusy === "cancel" ? <Loader className="animate-spin" /> : <XCircle />}
                Cancel event
              </Button>
            </>
          )}
        </div>
      </div>

      {headerMsg && (
        <div className={cn(
          "rounded-md border px-3 py-2 text-sm",
          headerMsg.tone === "ok"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-destructive/30 bg-destructive/10 text-destructive",
        )}>
          {headerMsg.text}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 shadow-xs">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content. Each tab is its own component that fetches lazily on
          first mount so we don't load all 7 datasets up front. */}
      <div>
        {tab === "overview"  && <OverviewTab  eventId={eventId!} />}
        {tab === "tickets"   && <TicketsTab   tickets={tickets} />}
        {tab === "attendees" && <AttendeesTab eventId={eventId!} />}
        {tab === "checkin"   && <CheckinTab   eventId={eventId!} />}
        {tab === "scanners"  && <ScannersTab  eventId={eventId!} />}
        {tab === "promo"     && <PromoTab     eventId={eventId!} />}
        {tab === "waitlist"  && <WaitlistTab  eventId={eventId!} />}
        {tab === "comms"     && <CommsTab     eventId={eventId!} />}
      </div>
    </div>
  )
}

// ===========================================================================
// Overview — quick stats + a direct link to the full analytics page
// ===========================================================================

interface OverviewData {
  // Mirrors GET /api/organizer/events/:id/analytics response → data.summary
  summary: {
    total_revenue: number | string
    total_sold: number
    total_capacity: number
    total_checked_in: number
    occupancy_pct: number
  }
}

function OverviewTab({ eventId }: { eventId: string }) {
  const [data, setData] = React.useState<OverviewData | null>(null)
  const [err, setErr] = React.useState("")
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/analytics`, { credentials: "include" })
        const body = await res.json()
        if (cancelled) return
        if (body?.success) setData(body.data as OverviewData)
        else setErr(body?.message || "Couldn't load overview.")
      } catch {
        if (!cancelled) setErr("Network error loading overview.")
      }
    })()
    return () => { cancelled = true }
  }, [eventId])

  if (err) return <ErrorBanner message={err} />
  if (!data) return <CardSkeleton />

  const s = data.summary
  const checkinPct = s.total_sold > 0 ? Math.round((s.total_checked_in / s.total_sold) * 100) : 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={formatLkr(s.total_revenue)} />
        <Stat label="Tickets sold" value={String(s.total_sold)} />
        <Stat label="Occupancy" value={`${s.occupancy_pct}%`} />
        <Stat label="Check-in" value={`${checkinPct}%`} />
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/organizer/events/${eventId}/analytics`}>
          <BarChart2 /> Open full analytics
        </Link>
      </Button>
    </div>
  )
}

// ===========================================================================
// Tickets — shows ticket types + sold/total. Edit lives on the /edit page.
// ===========================================================================

function TicketsTab({ tickets }: { tickets: TicketType[] | null }) {
  if (!tickets) return <CardSkeleton />
  if (tickets.length === 0) {
    return <EmptyHint icon={Ticket} text="No ticket types yet. Add some on the edit page." />
  }

  return (
    <ul className="space-y-2">
      {tickets.map(t => {
        const sold = t.quantity_sold ?? 0
        const total = t.quantity_total ?? 0
        const pct = total > 0 ? Math.round((sold / total) * 100) : 0
        return (
          <li key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{formatLkr(t.price)} · {sold} of {total} sold</div>
              </div>
              {t.is_active === false && <Badge variant="outline">Inactive</Badge>}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ===========================================================================
// Attendees — list with "Resend ticket" + "Refund" buttons
// ===========================================================================

function AttendeesTab({ eventId }: { eventId: string }) {
  const [bookings, setBookings] = React.useState<BookingRow[] | null>(null)
  const [err, setErr] = React.useState("")
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [actionMsg, setActionMsg] = React.useState<{ id: string; text: string; tone: "ok" | "err" } | null>(null)
  const [search, setSearch] = React.useState("")

  const fetchBookings = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/bookings`, { credentials: "include" })
      const body = await res.json()
      if (body?.success) setBookings((body.data?.bookings ?? []) as BookingRow[])
      else setErr(body?.message || "Couldn't load attendees.")
    } catch {
      setErr("Network error.")
    }
  }, [eventId])

  React.useEffect(() => { fetchBookings() }, [fetchBookings])

  const resend = async (b: BookingRow) => {
    setBusyId(b.id)
    setActionMsg(null)
    try {
      const res = await fetch(
        `${API_URL}/api/organizer/events/${eventId}/bookings/${b.id}/resend`,
        { method: "POST", credentials: "include" },
      )
      const body = await res.json()
      setActionMsg({ id: b.id, text: body?.message || (body?.success ? "Resent." : "Failed."), tone: body?.success ? "ok" : "err" })
    } catch {
      setActionMsg({ id: b.id, text: "Network error.", tone: "err" })
    } finally {
      setBusyId(null)
    }
  }

  const refund = async (b: BookingRow) => {
    const reason = window.prompt("Refund this booking? Optional reason:", "")
    if (reason === null) return
    setBusyId(b.id)
    setActionMsg(null)
    try {
      const res = await fetch(
        `${API_URL}/api/organizer/events/${eventId}/bookings/${b.id}/refund`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || undefined }),
        },
      )
      const body = await res.json()
      setActionMsg({ id: b.id, text: body?.message || (body?.success ? "Refund queued." : "Failed."), tone: body?.success ? "ok" : "err" })
      if (body?.success) await fetchBookings()
    } catch {
      setActionMsg({ id: b.id, text: "Network error.", tone: "err" })
    } finally {
      setBusyId(null)
    }
  }

  if (err) return <ErrorBanner message={err} />
  if (!bookings) return <CardSkeleton />

  const confirmedOnly = bookings.filter(b => b.status === "Confirmed")
  const q = search.trim().toLowerCase()
  const filtered = q
    ? confirmedOnly.filter(b =>
        b.attendee_info?.name?.toLowerCase().includes(q) ||
        b.attendee_info?.email?.toLowerCase().includes(q) ||
        b.guest_email?.toLowerCase().includes(q) ||
        b.booking_reference?.toLowerCase().includes(q) ||
        b.short_code?.toLowerCase().includes(q),
      )
    : confirmedOnly

  if (confirmedOnly.length === 0) return <EmptyHint icon={UsersIcon} text="No confirmed bookings yet." />

  return (
    <div className="space-y-3">
      <Input
        type="search"
        placeholder="Search by name, email, or booking ref…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="space-y-2">
        {filtered.map(b => {
          const name = b.attendee_info?.name || b.guest_name || "—"
          const email = b.attendee_info?.email || b.guest_email || "—"
          const isCheckedIn = !!b.checked_in_at
          const msg = actionMsg?.id === b.id ? actionMsg : null
          return (
            <li key={b.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{name}</span>
                  {isCheckedIn && (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" /> Checked in
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {email} · {b.number_of_tickets} ticket{b.number_of_tickets === 1 ? "" : "s"} · {formatLkr(b.total_amount)}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {b.short_code || b.booking_reference}
                </div>
                {msg && (
                  <p className={cn("mt-1 text-xs", msg.tone === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {msg.text}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => resend(b)} disabled={busyId === b.id}>
                  {busyId === b.id ? <Loader className="animate-spin" /> : <Send />}
                  Resend
                </Button>
                <Button variant="outline" size="sm" onClick={() => refund(b)} disabled={busyId === b.id || isCheckedIn} className="hover:bg-destructive/10 hover:text-destructive">
                  <RefreshCw />
                  Refund
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ===========================================================================
// Check-in — real-time totals + recent scans
// ===========================================================================

function CheckinTab({ eventId }: { eventId: string }) {
  const [data, setData] = React.useState<CheckinStatus | null>(null)
  const [err, setErr] = React.useState("")

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/check-in-status`, { credentials: "include" })
      const body = await res.json()
      if (body?.success) setData(body.data as CheckinStatus)
      else setErr(body?.message || "Couldn't load check-in status.")
    } catch {
      setErr("Network error.")
    }
  }, [eventId])

  React.useEffect(() => {
    fetchStatus()
    // Light polling — the gate is fast-moving on event day. 10s avoids
    // hammering the API while still feeling live.
    const t = setInterval(fetchStatus, 10_000)
    return () => clearInterval(t)
  }, [fetchStatus])

  if (err) return <ErrorBanner message={err} />
  if (!data) return <CardSkeleton />

  const t = data.totals
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Tickets sold" value={String(t.tickets)} />
        <Stat label="Checked in" value={String(t.checked_in_tickets)} />
        <Stat label="% through" value={`${t.checked_in_pct}%`} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Recent check-ins</h3>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.recent.map(r => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{r.name || "—"}</div>
                  <div className="text-xs font-mono text-muted-foreground">{r.booking_reference} · {r.number_of_tickets} ticket(s)</div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">{r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString() : ""}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ===========================================================================
// Scanners — issue and revoke invite codes for door-staff phones
// ===========================================================================

type ScannerInvite = {
  id: string
  gate_label: string | null
  device_label: string | null
  expires_at: string
  revoked_at: string | null
  redeemed_at: string | null
  last_used_at: string | null
  created_at: string
  computed_status: "unredeemed" | "active" | "revoked" | "expired"
}

type IssuedInvite = {
  id: string
  code: string
  gate_label: string | null
  expires_at: string
}

function ScannersTab({ eventId }: { eventId: string }) {
  const [invites, setInvites] = React.useState<ScannerInvite[] | null>(null)
  const [err, setErr] = React.useState("")
  const [form, setForm] = React.useState({ gate_label: "", expires_in_hours: "12" })
  const [creating, setCreating] = React.useState(false)
  const [formErr, setFormErr] = React.useState("")
  const [justIssued, setJustIssued] = React.useState<IssuedInvite | null>(null)
  const [copied, setCopied] = React.useState(false)

  const fetchInvites = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/organizer/scanner-invites?event_id=${eventId}`, { credentials: "include" })
      const body = await res.json()
      if (body?.success) setInvites((body.data ?? []) as ScannerInvite[])
      else setErr(body?.message || "Couldn't load scanner invites.")
    } catch {
      setErr("Network error.")
    }
  }, [eventId])

  React.useEffect(() => { fetchInvites() }, [fetchInvites])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErr("")
    setCreating(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/scanner-invites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          gate_label: form.gate_label.trim() || null,
          expires_in_hours: Number(form.expires_in_hours),
        }),
      })
      const body = await res.json()
      if (!body?.success) {
        setFormErr(body?.message || "Couldn't issue invite.")
        return
      }
      setJustIssued(body.data as IssuedInvite)
      setCopied(false)
      setForm({ gate_label: "", expires_in_hours: form.expires_in_hours })
      await fetchInvites()
    } catch {
      setFormErr("Network error.")
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id: string) => {
    if (!window.confirm("Revoke this scanner session? The phone using it will be signed out on its next request.")) return
    try {
      await fetch(`${API_URL}/api/organizer/scanner-invites/${id}/revoke`, {
        method: "POST",
        credentials: "include",
      })
      await fetchInvites()
    } catch {
      setErr("Network error revoking invite.")
    }
  }

  const copyCode = async () => {
    if (!justIssued) return
    try {
      await navigator.clipboard.writeText(justIssued.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — fall back to selection by user
    }
  }

  if (err) return <ErrorBanner message={err} />

  return (
    <div className="space-y-5">
      {/* Just-issued code — surfaced loudly because we can never show it again */}
      {justIssued && (
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">New invite issued</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Share this code with the door staff <strong>now</strong>. It will not be shown again.
                Expires {formatWhen(justIssued.expires_at)}.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setJustIssued(null)} aria-label="Dismiss">
              <XCircle />
            </Button>
          </div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="rounded-lg bg-white p-3 shrink-0 self-center sm:self-auto" aria-label="Scan this QR with the MyScope Organizer app to redeem">
              <QRCodeSVG value={justIssued.code} size={132} level="M" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.4em] text-foreground">
                {justIssued.code}
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={copyCode} size="sm" variant="outline" className="flex-1">
                  <Copy />
                  {copied ? "Copied" : "Copy code"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Staff can scan the QR in the MyScope Organizer app, or type the code manually.
              </p>
            </div>
          </div>
          {justIssued.gate_label && (
            <p className="mt-3 text-xs text-muted-foreground">Gate: <strong>{justIssued.gate_label}</strong></p>
          )}
        </div>
      )}

      {/* Issue form */}
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Issue scanner invite</h3>
        <p className="text-xs text-muted-foreground">
          Generate a one-time code your door staff can redeem in the MyScope Organizer app to scan tickets — no MyScope account required.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Gate label (optional, e.g. Main Gate)"
            value={form.gate_label}
            onChange={(e) => setForm({ ...form, gate_label: e.target.value })}
            maxLength={60}
          />
          <select
            aria-label="Expires in"
            value={form.expires_in_hours}
            onChange={(e) => setForm({ ...form, expires_in_hours: e.target.value })}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="4">Expires in 4 hours</option>
            <option value="8">Expires in 8 hours</option>
            <option value="12">Expires in 12 hours</option>
            <option value="24">Expires in 24 hours</option>
            <option value="48">Expires in 48 hours</option>
          </select>
        </div>
        {formErr && <p className="text-xs text-destructive">{formErr}</p>}
        <Button type="submit" size="sm" disabled={creating}>
          {creating ? <Loader className="animate-spin" /> : <QrCode />}
          Issue invite
        </Button>
      </form>

      {/* List */}
      {!invites ? (
        <CardSkeleton />
      ) : invites.length === 0 ? (
        <EmptyHint icon={QrCode} text="No scanner invites yet. Issue one above to delegate door-scanning to staff." />
      ) : (
        <ul className="space-y-2">
          {invites.map(inv => {
            const variant: "default" | "warning" | "success" | "destructive" | "outline" =
              inv.computed_status === "active"     ? "success" :
              inv.computed_status === "unredeemed" ? "warning" :
              inv.computed_status === "revoked"   ? "destructive" :
                                                    "outline"
            const canRevoke = inv.computed_status === "active" || inv.computed_status === "unredeemed"
            return (
              <li key={inv.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-base font-semibold text-foreground">
                      {inv.gate_label || "(no gate label)"}
                    </span>
                    <Badge variant={variant}>{inv.computed_status}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {inv.device_label ? <>Phone: <strong>{inv.device_label}</strong> · </> : null}
                    Expires {formatWhen(inv.expires_at)}
                    {inv.last_used_at && <> · last scan {formatWhen(inv.last_used_at)}</>}
                  </div>
                </div>
                {canRevoke && (
                  <Button variant="outline" size="sm" onClick={() => revoke(inv.id)} className="hover:bg-destructive/10 hover:text-destructive">
                    <XCircle /> Revoke
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ===========================================================================
// Promo codes — create / list / delete
// ===========================================================================

function PromoTab({ eventId }: { eventId: string }) {
  const [codes, setCodes] = React.useState<PromoCode[] | null>(null)
  const [err, setErr] = React.useState("")
  const [form, setForm] = React.useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    max_uses: "",
    min_total: "",
  })
  const [creating, setCreating] = React.useState(false)
  const [formErr, setFormErr] = React.useState("")

  const fetchCodes = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/promo-codes`, { credentials: "include" })
      const body = await res.json()
      if (body?.success) setCodes((body.data?.promo_codes ?? []) as PromoCode[])
      else setErr(body?.message || "Couldn't load promo codes.")
    } catch {
      setErr("Network error.")
    }
  }, [eventId])

  React.useEffect(() => { fetchCodes() }, [fetchCodes])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErr("")
    setCreating(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/promo-codes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          min_total: form.min_total ? Number(form.min_total) : null,
        }),
      })
      const body = await res.json()
      if (!body?.success) {
        setFormErr(body?.message || "Couldn't create code.")
        return
      }
      setForm({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", min_total: "" })
      await fetchCodes()
    } catch {
      setFormErr("Network error.")
    } finally {
      setCreating(false)
    }
  }

  const removeCode = async (id: string) => {
    if (!window.confirm("Delete this promo code? Anyone with it won't be able to redeem anymore.")) return
    try {
      await fetch(`${API_URL}/api/organizer/events/${eventId}/promo-codes/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      await fetchCodes()
    } catch {
      setErr("Network error deleting code.")
    }
  }

  if (err) return <ErrorBanner message={err} />

  return (
    <div className="space-y-5">
      {/* Create form */}
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">New promo code</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="CODE (e.g. EARLY10)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="font-mono uppercase"
            required
          />
          <select
            aria-label="Discount type"
            value={form.discount_type}
            onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "fixed" })}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="percentage">Percent off (%)</option>
            <option value="fixed">Fixed amount off (LKR)</option>
          </select>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={form.discount_type === "percentage" ? "Percent (e.g. 10)" : "LKR off (e.g. 500)"}
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
            required
          />
          <Input
            type="number"
            min="1"
            placeholder="Max uses (blank = unlimited)"
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
          />
          <Input
            type="number"
            min="0"
            placeholder="Min booking total (LKR, optional)"
            value={form.min_total}
            onChange={(e) => setForm({ ...form, min_total: e.target.value })}
          />
        </div>
        {formErr && <p className="text-xs text-destructive">{formErr}</p>}
        <Button type="submit" size="sm" disabled={creating}>
          {creating ? <Loader className="animate-spin" /> : <Tag />}
          Create code
        </Button>
      </form>

      {/* List */}
      {!codes ? (
        <CardSkeleton />
      ) : codes.length === 0 ? (
        <EmptyHint icon={Tag} text="No promo codes yet. Create one above to give a discount." />
      ) : (
        <ul className="space-y-2">
          {codes.map(c => {
            const valueLabel = c.discount_type === "percentage"
              ? `${Number(c.discount_value)}% off`
              : `${formatLkr(c.discount_value)} off`
            return (
              <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-base font-bold tracking-wider text-foreground">{c.code}</span>
                    <Badge variant="outline">{valueLabel}</Badge>
                    {!c.active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Used {c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : " (unlimited)"}
                    {c.min_total != null && ` · min ${formatLkr(c.min_total)}`}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => removeCode(c.id)} className="hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 /> Delete
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ===========================================================================
// Waitlist
// ===========================================================================

function WaitlistTab({ eventId }: { eventId: string }) {
  const [entries, setEntries] = React.useState<WaitlistEntry[] | null>(null)
  const [err, setErr] = React.useState("")
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/waitlist`, { credentials: "include" })
        const body = await res.json()
        if (cancelled) return
        if (body?.success) setEntries((body.data?.waitlist ?? []) as WaitlistEntry[])
        else setErr(body?.message || "Couldn't load waitlist.")
      } catch {
        if (!cancelled) setErr("Network error.")
      }
    })()
    return () => { cancelled = true }
  }, [eventId])

  if (err) return <ErrorBanner message={err} />
  if (!entries) return <CardSkeleton />
  if (entries.length === 0) return <EmptyHint icon={Bell} text="No one on the waitlist yet." />

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        These people will be notified when seats open up. (Auto-notification cron is coming — for now, you can reach out manually.)
      </p>
      <ul className="space-y-2">
        {entries.map(w => (
          <li key={w.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{w.name || "—"}</div>
              <div className="text-xs text-muted-foreground">{w.email} · wants {w.requested_quantity} ticket(s)</div>
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">
              joined {new Date(w.created_at).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ===========================================================================
// Comms — placeholder for the upcoming announcement feature
// ===========================================================================

function CommsTab({ eventId }: { eventId: string }) {
  type Channel = "email" | "sms" | "both"
  const [message, setMessage] = React.useState("")
  const [channel, setChannel] = React.useState<Channel>("email")
  const [sending, setSending] = React.useState(false)
  const [result, setResult] = React.useState<{ text: string; tone: "ok" | "err" } | null>(null)

  // SMS messages charge per ~160-char segment (Unicode = 70). Show the
  // organizer their roughly-projected segment count so they're not surprised
  // by a long body burning through SMS credit.
  const smsSegments = Math.max(1, Math.ceil((message.length + 30) / 160))

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setResult({ text: "Message is required.", tone: "err" })
      return
    }
    const channelLabel = channel === "both" ? "email and SMS" : channel === "sms" ? "SMS" : "email"
    if (!window.confirm(`Send this announcement to every confirmed attendee via ${channelLabel}?`)) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/announce`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), channel }),
      })
      const body = await res.json()
      setResult({
        text: body?.message || (body?.success ? "Sent." : "Failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) setMessage("")
    } catch {
      setResult({ text: "Network error.", tone: "err" })
    } finally {
      setSending(false)
    }
  }

  const channelOptions: Array<{ value: Channel; label: string; hint: string }> = [
    { value: "email", label: "Email",       hint: "Best for long messages and attachments." },
    { value: "sms",   label: "SMS",         hint: "Time-sensitive alerts. Charged per segment by text.lk." },
    { value: "both",  label: "Email + SMS", hint: "Belt-and-braces for last-minute changes." },
  ]
  const currentHint = channelOptions.find(c => c.value === channel)?.hint

  return (
    <form onSubmit={send} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Send announcement to attendees</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Goes to every confirmed attendee — parking info, schedule updates, weather notes, or any other heads-up. Deduplicated.
        </p>
      </div>

      {/* Channel selector — segmented control */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Channel</div>
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
          {channelOptions.map(opt => {
            const active = channel === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setChannel(opt.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {currentHint && (
          <p className="mt-1 text-[11px] text-muted-foreground">{currentHint}</p>
        )}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your message…"
        rows={6}
        maxLength={5000}
        required
        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">
          {message.length}/5000
          {(channel === "sms" || channel === "both") && (
            <span className="ml-2">· ~{smsSegments} SMS segment{smsSegments === 1 ? "" : "s"}</span>
          )}
        </span>
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? <Loader className="animate-spin" /> : <Send />}
          {sending ? "Sending…" : "Send to all attendees"}
        </Button>
      </div>
      {result && (
        <p className={cn(
          "text-xs",
          result.tone === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
        )}>
          {result.text}
        </p>
      )}
    </form>
  )
}

// ===========================================================================
// Tiny shared primitives
// ===========================================================================

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function CardSkeleton() {
  return <div className="h-32 animate-pulse rounded-xl bg-muted" />
}

function EmptyHint({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

