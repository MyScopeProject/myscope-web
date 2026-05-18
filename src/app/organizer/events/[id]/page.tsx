"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
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
  Mail,
  MapPin,
  RefreshCw,
  Send,
  Tag,
  Ticket,
  Trash2,
  Users as UsersIcon,
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
  | "promo"
  | "waitlist"
  | "comms"

const TABS: Array<{ value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "overview",  label: "Overview",   icon: BarChart2 },
  { value: "tickets",   label: "Tickets",    icon: Ticket },
  { value: "attendees", label: "Attendees",  icon: UsersIcon },
  { value: "checkin",   label: "Check-in",   icon: ClipboardList },
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
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [tab, setTab] = React.useState<Tab>("overview")

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
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setEvent(data.data?.event ?? null)
      } else {
        setError(data?.message || "Couldn't load event.")
      }
    } catch {
      setError("Network error loading event.")
    } finally {
      setLoading(false)
    }
  }, [eventId])

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
  const canEdit = ["draft", "pending", "rejected"].includes(event.approval_status)

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
        {canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/organizer/events/${eventId}/edit`}>
              <Edit3 /> Edit event
            </Link>
          </Button>
        )}
      </div>

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
        {tab === "tickets"   && <TicketsTab   eventId={eventId!} />}
        {tab === "attendees" && <AttendeesTab eventId={eventId!} />}
        {tab === "checkin"   && <CheckinTab   eventId={eventId!} />}
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

function TicketsTab({ eventId }: { eventId: string }) {
  const [tickets, setTickets] = React.useState<TicketType[] | null>(null)
  const [err, setErr] = React.useState("")
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/ticket-types`, { credentials: "include" })
        const body = await res.json()
        if (cancelled) return
        if (body?.success) setTickets((body.data?.ticket_types ?? []) as TicketType[])
        else setErr(body?.message || "Couldn't load tickets.")
      } catch {
        if (!cancelled) setErr("Network error.")
      }
    })()
    return () => { cancelled = true }
  }, [eventId])

  if (err) return <ErrorBanner message={err} />
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
  void eventId
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Mail className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">Bulk announcements — coming next</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        We&rsquo;re building send-to-all-attendees so you can ping everyone with parking info, schedule updates, or cancellation notices.
        For now, you can resend an individual ticket from the Attendees tab.
      </p>
    </div>
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

