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
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Loader,
  Copy,
  Mail,
  MapPin,
  Minus,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Send,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
  Users as UsersIcon,
  XCircle,
} from "lucide-react"
import { EventCommunicationsCard } from "@/components/events/event-communications-card"
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
  end_time?: string | null
  date?: string | null
  banner_url?: string | null
  approval_status: ApprovalStatus
  seating_mode?: string | null
  postponed?: boolean
  postponed_to?: string | null
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
  // True when this row was issued via the Invite tab as a comp ticket (the
  // server joins event_invitations to flag it). Drives the "Invited" badge.
  is_invitation?: boolean
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
  | "invite"

const TABS: Array<{ value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "overview",  label: "Overview",   icon: BarChart2 },
  { value: "tickets",   label: "Tickets",    icon: Ticket },
  { value: "attendees", label: "Attendees",  icon: UsersIcon },
  { value: "checkin",   label: "Check-in",   icon: ClipboardList },
  { value: "scanners",  label: "Scanners",   icon: QrCode },
  { value: "promo",     label: "Promo codes", icon: Tag },
  { value: "waitlist",  label: "Waitlist",   icon: Bell },
  { value: "comms",     label: "Comms",      icon: Mail },
  { value: "invite",    label: "Invite",     icon: Send },
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

// Compact relative-time. Falls back to formatWhen() once we're past a day so
// the live dashboard stays at "12 sec ago" / "3 min ago" / "2 hr ago" without
// drifting into multi-word strings.
const formatRelative = (iso?: string | null) => {
  if (!iso) return "—"
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) return formatWhen(iso)
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60)   return `${sec} sec ago`
  const min = Math.floor(sec / 60)
  if (min < 60)   return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)    return `${hr} hr ago`
  return formatWhen(iso)
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
  const [headerBusy, setHeaderBusy] = React.useState<null | "pause" | "resume" | "unpostpone">(null)
  const [headerMsg, setHeaderMsg] = React.useState<{ text: string; tone: "ok" | "err" } | null>(null)
  const [postponeOpen, setPostponeOpen] = React.useState(false)

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


  const unpostponeEvent = async () => {
    if (!eventId) return
    if (!confirm("Undo postpone? The event returns to its scheduled date and ticket sales reopen.")) return
    setHeaderBusy("unpostpone")
    setHeaderMsg(null)
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/unpostpone`, {
        method: "POST",
        credentials: "include",
      })
      const body = await res.json()
      setHeaderMsg({
        text: body?.message || (body?.success ? "Reopened." : "Failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) {
        await fetchEvent()
        await refreshTickets()
      }
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

  // Pending (and draft) events have nothing to manage yet — only Edit/Delete
  // make sense. If one is opened by direct URL, send the organizer to Edit.
  React.useEffect(() => {
    if (event && (event.approval_status === "pending" || event.approval_status === "draft")) {
      router.replace(`/organizer/events/${eventId}/edit`)
    }
  }, [event, eventId, router])

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

  // Redirect-in-progress for pending/draft (see effect above) — avoid flashing
  // the manage dashboard before the route swap lands.
  if (event.approval_status === "pending" || event.approval_status === "draft") {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
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
            {event.postponed && (
              <Badge variant="warning">
                Postponed{event.postponed_to ? ` to ${new Date(event.postponed_to).toLocaleDateString()}` : " (date TBA)"}
              </Badge>
            )}
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
              {event.postponed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unpostponeEvent}
                  disabled={headerBusy !== null}
                >
                  {headerBusy === "unpostpone" ? <Loader className="animate-spin" /> : <RotateCcw />}
                  Undo postpone
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPostponeOpen(true)}
                  disabled={headerBusy !== null}
                >
                  <CalendarClock />
                  Postpone
                </Button>
              )}
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

      {postponeOpen && (
        <PostponeModal
          eventId={eventId}
          onClose={() => setPostponeOpen(false)}
          onDone={(msg) => {
            setPostponeOpen(false)
            setHeaderMsg({ text: msg, tone: "ok" })
            fetchEvent()
          }}
        />
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
        {tab === "invite"    && <InviteTab    eventId={eventId!} tickets={tickets} />}
      </div>
    </div>
  )
}

// ===========================================================================
// Overview — the full analytics dashboard, surfaced inline on the manage
// page so the organizer doesn't need to bounce to a separate route. Pulls
// from /analytics + /invitations, then renders: 4 headline stat cards, a
// small invitations tile, the communications log, and the per-tier sold/
// revenue breakdown. The Attendees table that used to live on the separate
// analytics page is intentionally left here — it's already its own tab.
// ===========================================================================

interface TicketTypeStat {
  id: string
  name: string
  price: number
  quantity: number
  sold: number
  revenue: number
  checked_in: number
}

interface OverviewData {
  summary: {
    total_revenue: number | string
    total_sold: number
    total_capacity: number
    total_checked_in: number
    occupancy_pct: number
  }
  ticket_types: TicketTypeStat[]
  attendees?: Array<{ id: string }>  // length used for the Bookings tile
}

function OverviewTab({ eventId }: { eventId: string }) {
  const [data, setData] = React.useState<OverviewData | null>(null)
  // Invitation counts surfaced as a separate small tile (sent / failed
  // split). Fetched alongside analytics so the Overview reflects outreach
  // at a glance. Soft-fails: a network error here doesn't block the rest.
  const [invites, setInvites] = React.useState<{ sent: number; failed: number } | null>(null)
  const [err, setErr] = React.useState("")
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [analyticsRes, invitesRes] = await Promise.all([
          fetch(`${API_URL}/api/organizer/events/${eventId}/analytics`, { credentials: "include" }),
          fetch(`${API_URL}/api/organizer/events/${eventId}/invitations`, { credentials: "include" }),
        ])
        if (cancelled) return
        const analyticsBody = await analyticsRes.json()
        if (analyticsBody?.success) setData(analyticsBody.data as OverviewData)
        else setErr(analyticsBody?.message || "Couldn't load overview.")
        try {
          const invBody = await invitesRes.json()
          if (!cancelled && invBody?.success) {
            const rows = (invBody.data?.invitations ?? []) as Array<{ status: string }>
            let sent = 0
            let failed = 0
            for (const r of rows) {
              if (r.status === "sent") sent += 1
              else failed += 1
            }
            setInvites({ sent, failed })
          }
        } catch {
          /* leave invites null — its tile just shows "—" */
        }
      } catch {
        if (!cancelled) setErr("Network error loading overview.")
      }
    })()
    return () => { cancelled = true }
  }, [eventId])

  if (err) return <ErrorBanner message={err} />
  if (!data) return <CardSkeleton />

  const s = data.summary
  const bookingsCount = data.attendees?.length ?? 0
  const checkinPct = s.total_sold > 0 ? Math.round((s.total_checked_in / s.total_sold) * 100) : 0
  const invitesValue = invites ? String(invites.sent + invites.failed) : "—"
  return (
    <div className="space-y-5">
      {/* Headline stat cards — same 4 the standalone analytics page used. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <BigStat
          icon={TrendingUp}
          label="Revenue"
          value={formatLkr(s.total_revenue)}
        />
        <BigStat
          icon={Ticket}
          label="Tickets sold"
          value={`${s.total_sold} / ${s.total_capacity}`}
          hint={`${s.occupancy_pct}% full`}
        />
        <BigStat
          icon={UsersIcon}
          label="Bookings"
          value={bookingsCount.toLocaleString()}
        />
        <BigStat
          icon={CheckCircle}
          label="Checked in"
          value={`${s.total_checked_in} / ${s.total_sold}`}
          hint={s.total_sold > 0 ? `${checkinPct}%` : "—"}
          tone="success"
        />
      </div>

      {/* Invitations — small standalone tile so it doesn't crowd the headline
          row when the organizer hasn't used the Invite tab yet. */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invitations</div>
            <div className="mt-1 text-xl font-bold text-foreground">{invitesValue}</div>
            {invites && invites.failed > 0 && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {invites.sent} sent · {invites.failed} failed
              </div>
            )}
          </div>
          <Send className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Communications — email + SMS counts per type (booking confirmation,
          postponement, etc.). Same component the standalone analytics page used. */}
      <EventCommunicationsCard
        endpoint={`/api/organizer/events/${eventId}/communications`}
      />

      {/* Per-tier sold + revenue breakdown — pulled from /analytics response. */}
      {data.ticket_types && data.ticket_types.length > 0 && (
        <section className="rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart2 className="h-4 w-4 text-primary" /> Ticket-type breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Sold</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Checked in</th>
                </tr>
              </thead>
              <tbody>
                {data.ticket_types.map((tt) => {
                  const soldPct = tt.quantity > 0 ? Math.round((tt.sold / tt.quantity) * 100) : 0
                  return (
                    <tr key={tt.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-foreground">{tt.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatLkr(tt.price)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{tt.sold} / {tt.quantity}</span>
                          <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block">
                            <div className="h-full bg-primary" style={{ width: `${soldPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{formatLkr(tt.revenue)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tt.checked_in}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

// Larger headline stat tile (replaces the separate analytics page's StatCard).
function BigStat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  tone?: "default" | "success" | "warning"
}) {
  const iconStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }[tone]
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
        </div>
        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md", iconStyles)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
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
                  {/* Comp tickets issued via the Invite tab — gives the
                      organizer a quick visual to tell comp attendees from
                      paid ones (same row layout, no other differences). */}
                  {b.is_invitation && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary"
                      title="Comp ticket issued from the Invite tab"
                    >
                      <Send className="h-3 w-3" /> Invited
                    </span>
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

type GateStat = { label: string; scanned: number }

function CheckinTab({ eventId }: { eventId: string }) {
  const [data, setData] = React.useState<CheckinStatus | null>(null)
  const [gates, setGates] = React.useState<GateStat[]>([])
  const [err, setErr] = React.useState("")

  const fetchStatus = React.useCallback(async () => {
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/organizer/events/${eventId}/check-in-status`, { credentials: "include" }),
        fetch(`${API_URL}/api/scanner/events/${eventId}/stats`, { credentials: "include" }),
      ])
      const statusBody = await statusRes.json()
      if (statusBody?.success) setData(statusBody.data as CheckinStatus)
      else setErr(statusBody?.message || "Couldn't load check-in status.")

      // The scanner endpoint may legitimately 404 for events outside the
      // organizer's reach (shouldn't happen here) or 403 for non-scanner-eligible
      // roles. Swallow non-success and just hide the by-gate section.
      const statsBody = await statsRes.json().catch(() => null)
      if (statsBody?.success && Array.isArray(statsBody.data?.gates)) {
        setGates(statsBody.data.gates as GateStat[])
      } else {
        setGates([])
      }
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
  const totalScanned = gates.reduce((s, g) => s + g.scanned, 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Tickets sold" value={String(t.tickets)} />
        <Stat label="Checked in" value={String(t.checked_in_tickets)} />
        <Stat label="% through" value={`${t.checked_in_pct}%`} />
      </div>

      {gates.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">By gate</h3>
          <ul className="space-y-2">
            {gates.map(g => {
              const share = totalScanned > 0 ? Math.round((g.scanned / totalScanned) * 100) : 0
              return (
                <li key={g.label} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{g.label}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {g.scanned} <span className="text-xs font-normal text-muted-foreground">· {share}%</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

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
  scan_count: number
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

  React.useEffect(() => {
    fetchInvites()
    // Light polling — Scanners tab doubles as the live monitor during the
    // event so the scan counts and last-activity timestamps stay current.
    const t = setInterval(fetchInvites, 10_000)
    return () => clearInterval(t)
  }, [fetchInvites])

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
                    {inv.scan_count > 0 && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {inv.scan_count} scan{inv.scan_count === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {inv.device_label ? <>Phone: <strong>{inv.device_label}</strong> · </> : null}
                    Expires {formatWhen(inv.expires_at)}
                    {inv.last_used_at && <> · last activity {formatRelative(inv.last_used_at)}</>}
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
// Invite — paste emails, send invitations, see what's gone out
// ===========================================================================

interface Invitation {
  id: string
  email: string
  status: "sent" | "failed" | string
  error_message: string | null
  created_at: string
  // Each successful invitation produces a real comp booking — same shape
  // as a paid one (status='Confirmed', total_amount=0). The short_code is
  // what shows on the ticket QR + on the printed pass.
  booking_id: string | null
  booking_short_code: string | null
}

function InviteTab({ eventId, tickets }: { eventId: string; tickets: TicketType[] | null }) {
  // Composer state — one invitation per submission. The form's three inputs
  // map 1:1 to the API's body shape: { email, ticket_type_id, quantity }.
  const [email, setEmail] = React.useState("")
  const [ticketTypeId, setTicketTypeId] = React.useState<string>("")
  const [quantity, setQuantity] = React.useState<number>(1)
  const [sending, setSending] = React.useState(false)
  const [result, setResult] = React.useState<{ text: string; tone: "ok" | "err" } | null>(null)

  // History list (server is source of truth, refetched after each send).
  const [list, setList] = React.useState<Invitation[]>([])
  const [listLoading, setListLoading] = React.useState(true)
  const [listError, setListError] = React.useState<string | null>(null)

  const emailInputRef = React.useRef<HTMLInputElement | null>(null)

  // Tier options shown in the select: active tiers that still have stock.
  // We don't filter on sale_start / sale_end here because comps shouldn't be
  // gated by the public sale window — organizers issue them outside that flow.
  const tierOptions = React.useMemo(() => {
    return (tickets || [])
      .filter((t) => t.is_active !== false)
      .map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price ?? 0),
        remaining: Math.max(0, Number(t.quantity_total ?? 0) - Number(t.quantity_sold ?? 0)),
      }))
      .filter((t) => t.remaining > 0)
  }, [tickets])

  const selectedTier = React.useMemo(
    () => tierOptions.find((t) => t.id === ticketTypeId) ?? null,
    [tierOptions, ticketTypeId],
  )
  const maxQty = selectedTier?.remaining ?? 1

  // Whenever the tier list changes (parent reload), reset the selection to
  // the first available tier and clamp quantity so it can never exceed stock.
  React.useEffect(() => {
    setTicketTypeId((prev) => {
      if (tierOptions.length === 0) return ""
      if (prev && tierOptions.some((t) => t.id === prev)) return prev
      return tierOptions[0].id
    })
  }, [tierOptions])

  React.useEffect(() => {
    setQuantity((prev) => Math.max(1, Math.min(prev, maxQty)))
  }, [maxQty])

  const loadList = React.useCallback(async () => {
    try {
      setListError(null)
      setListLoading(true)
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/invitations`, {
        credentials: "include",
      })
      const body = await res.json()
      if (body?.success) {
        setList((body.data?.invitations ?? []) as Invitation[])
      } else {
        setListError(body?.message || "Couldn't load invitations.")
      }
    } catch {
      setListError("Network error loading invitations.")
    } finally {
      setListLoading(false)
    }
  }, [eventId])

  React.useEffect(() => {
    loadList()
  }, [loadList])

  // Resend on a history row: prefill the email field (don't auto-send, since
  // the organizer may want to swap the tier or quantity before retrying).
  // Resending a successful comp is a no-op upstream — the API blocks repeat
  // issuance — so this is primarily useful for the previously-failed rows.
  const handleResend = React.useCallback((rowEmail: string) => {
    setEmail(rowEmail)
    setResult(null)
    requestAnimationFrame(() => {
      const el = emailInputRef.current
      if (!el) return
      el.focus()
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }, [])

  // Client-side gate — the API re-validates regardless.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSend = emailOk && !!ticketTypeId && quantity >= 1 && quantity <= maxQty

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend) {
      setResult({
        text: !emailOk
          ? "Enter a valid email address."
          : !ticketTypeId
            ? "Pick a ticket tier."
            : "Pick a valid quantity.",
        tone: "err",
      })
      return
    }
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/invitations`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          ticket_type_id: ticketTypeId,
          quantity,
        }),
      })
      const body = await res.json()
      setResult({
        text: body?.message || (body?.success ? "Sent." : "Failed."),
        tone: body?.success ? "ok" : "err",
      })
      if (body?.success) {
        setEmail("")
        setQuantity(1)
        await loadList()
      }
    } catch {
      setResult({ text: "Network error sending invitation.", tone: "err" })
    } finally {
      setSending(false)
    }
  }

  const noTiersAvailable = tierOptions.length === 0

  return (
    <div className="space-y-6">
      {/* Composer */}
      <form
        onSubmit={send}
        className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs"
      >
        <header className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Send className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Invite someone — they get a free ticket</h2>
            <p className="text-xs text-muted-foreground">
              Pick the tier, choose how many tickets, and we'll email a
              QR-coded comp ticket to your invitee. Comps come out of the
              same stock as paid tickets, so they count toward capacity.
            </p>
          </div>
        </header>

        {noTiersAvailable && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>No active ticket tier with stock — add or activate a tier (with available capacity) before sending invitations.</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          {/* Email */}
          <div className="space-y-1.5 sm:col-span-6">
            <label htmlFor="invite-email" className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Invitee email
            </label>
            <Input
              id="invite-email"
              ref={emailInputRef}
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Tier select */}
          <div className="space-y-1.5 sm:col-span-4">
            <label htmlFor="invite-tier" className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ticket tier
            </label>
            <select
              id="invite-tier"
              value={ticketTypeId}
              onChange={(e) => setTicketTypeId(e.target.value)}
              disabled={noTiersAvailable}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm disabled:opacity-60"
            >
              {tierOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.price === 0 ? "Free" : `LKR ${t.price.toLocaleString()}`} · {t.remaining} left
                </option>
              ))}
              {noTiersAvailable && <option value="">No tiers available</option>}
            </select>
          </div>

          {/* Quantity stepper */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tickets
            </label>
            <div className="flex h-9 items-center rounded-md border border-input bg-card">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || noTiersAvailable}
                aria-label="Decrease quantity"
                className="flex h-full w-9 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex-1 text-center text-sm font-semibold tabular-nums text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty || noTiersAvailable}
                aria-label="Increase quantity"
                className="flex h-full w-9 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {result && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm",
                result.tone === "ok"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {result.tone === "ok" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {result.text}
            </span>
          )}
          <Button type="submit" disabled={sending || !canSend}>
            {sending ? <Loader className="animate-spin" /> : <Send />}
            {sending ? "Sending…" : `Send invitation${quantity === 1 ? "" : ` (${quantity} tickets)`}`}
          </Button>
        </div>
      </form>

      {/* History */}
      <section className="rounded-2xl border border-border bg-card shadow-xs">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Invitations sent</h2>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {list.length}
          </span>
        </header>

        {listLoading ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
        ) : listError ? (
          <div className="px-5 py-6 text-sm text-destructive">{listError}</div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Send className="h-4 w-4" />
            </span>
            <p className="text-sm text-muted-foreground">
              No invitations sent yet. Fill in the form above to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    inv.status === "sent"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/15 text-destructive",
                  )}
                  aria-hidden
                  title={inv.status === "sent" ? "Delivered to gateway" : inv.error_message || "Failed"}
                >
                  {inv.status === "sent" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">{inv.email}</div>
                  {inv.status === "sent" && inv.booking_short_code && (
                    <div className="truncate text-xs text-muted-foreground">
                      Ticket <span className="font-mono">{inv.booking_short_code}</span>
                    </div>
                  )}
                  {inv.status !== "sent" && inv.error_message && (
                    <div className="truncate text-xs text-destructive">{inv.error_message}</div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(inv.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {/* Resend prefills the email field — the organizer still picks
                    tier + quantity and confirms before any new ticket is issued.
                    Useful mainly for retrying previously-failed rows; the API
                    blocks repeat issuance for already-successful comps. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleResend(inv.email)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// ===========================================================================
// Tiny shared primitives
// ===========================================================================

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
      {note && (
        <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">{note}</div>
      )}
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

// Postpone modal. Two modes: keep selling (still buyable, shown as postponed)
// or stop sales (not buyable). A new date is optional — omit it to postpone with
// the date "to be announced". Existing tickets stay valid either way.
function PostponeModal({
  eventId,
  onClose,
  onDone,
}: {
  eventId: string
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [start, setStart] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [notify, setNotify] = React.useState(true)
  const [closeSales, setCloseSales] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState("")

  const submit = async () => {
    setBusy(true)
    setErr("")
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/postpone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_start_time: start || undefined,
          reason: reason.trim() || undefined,
          notify,
          close_sales: closeSales,
        }),
      })
      const body = await res.json()
      if (!body?.success) {
        setErr(body?.message || "Failed to postpone.")
        return
      }
      onDone(body.message || "Event postponed.")
    } catch {
      setErr("Network error.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Postpone event</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mark this event as postponed. Existing tickets stay valid.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {err && (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        )}

        <div className="space-y-4">
          {/* Sales mode */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">While postponed</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCloseSales(false)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  !closeSales
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span className="block text-sm font-semibold text-foreground">Keep selling tickets</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Buyers can still book for the new date.</span>
              </button>
              <button
                type="button"
                onClick={() => setCloseSales(true)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  closeSales
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span className="block text-sm font-semibold text-foreground">Stop ticket sales</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Tickets can&rsquo;t be bought for now.</span>
              </button>
            </div>
          </div>

          {/* New date — optional */}
          <div>
            <label htmlFor="postpone-start" className="mb-1.5 block text-sm font-medium text-foreground">
              New date <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="postpone-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty to postpone with the new date announced later.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="postpone-reason" className="mb-1.5 block text-sm font-medium text-foreground">
              Reason <span className="text-muted-foreground">(optional)</span>
            </label>
            <p className="mb-1.5 text-xs text-muted-foreground">
              This message is included in the email and SMS sent to confirmed attendees, so please
              word it formally and clearly.
            </p>
            <textarea
              id="postpone-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Due to adverse weather, the event has been rescheduled for everyone's safety."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Notify confirmed attendees by email &amp; SMS
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? <Loader className="animate-spin" /> : <CalendarClock />}
            {busy ? "Postponing…" : "Postpone event"}
          </Button>
        </div>
      </div>
    </div>
  )
}

