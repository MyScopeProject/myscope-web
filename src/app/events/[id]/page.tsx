"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Apple,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  ImageIcon,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Share2,
  Ticket,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface TicketType {
  id: string
  name: string
  description?: string | null
  price: number | string
  quantity_total: number
  quantity_sold: number
  per_order_limit?: number
  sale_start?: string | null
  sale_end?: string | null
}

interface Event {
  id?: string
  _id: string
  title: string
  description: string
  date: string
  start_time?: string
  end_time?: string | null
  location: string
  venue_name?: string
  venue_address?: string | null
  banner_url?: string | null
  price: number
  tickets_available: number
  tickets_sold: number
  category: string
  organizer: {
    id?: string
    _id: string
    name: string
    email: string
  }
  attendees: string[]
  status: string
  featured: boolean
  ticket_types?: TicketType[]
}

const formatLkr = (n: number) =>
  n === 0 ? "Free" : `LKR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const ticketRemaining = (t: TicketType) =>
  Math.max(0, (t.quantity_total ?? 0) - (t.quantity_sold ?? 0))

const ticketStatus = (t: TicketType): "soldout" | "not_started" | "ended" | "available" => {
  if (ticketRemaining(t) <= 0) return "soldout"
  const now = Date.now()
  if (t.sale_start && new Date(t.sale_start).getTime() > now) return "not_started"
  if (t.sale_end && new Date(t.sale_end).getTime() < now) return "ended"
  return "available"
}

// Calendar helpers — both Google Calendar and ICS expect a "floating" UTC string.
const toCalDate = (d: Date) =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000

interface CalendarEvent {
  title: string
  description: string
  location: string
  start: Date
  end: Date
}

const buildCalendarEvent = (event: Event): CalendarEvent | null => {
  const startIso = event.start_time || event.date
  if (!startIso) return null
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return null
  const end = event.end_time
    ? new Date(event.end_time)
    : new Date(start.getTime() + DEFAULT_DURATION_MS)
  const location = [event.venue_name, event.venue_address || event.location]
    .filter(Boolean)
    .join(", ")
  return {
    title: event.title,
    description: event.description || "",
    location,
    start,
    end,
  }
}

const googleCalendarUrl = (e: CalendarEvent) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${toCalDate(e.start)}/${toCalDate(e.end)}`,
    details: e.description,
    location: e.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const downloadIcs = (e: CalendarEvent) => {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyScope//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@myscope.lk`,
    `DTSTAMP:${toCalDate(new Date())}`,
    `DTSTART:${toCalDate(e.start)}`,
    `DTEND:${toCalDate(e.end)}`,
    `SUMMARY:${e.title.replace(/[,;]/g, (m) => `\\${m}`)}`,
    `DESCRIPTION:${e.description.replace(/[\n,;]/g, (m) => (m === "\n" ? "\\n" : `\\${m}`))}`,
    `LOCATION:${e.location.replace(/[,;]/g, (m) => `\\${m}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${e.title.replace(/\s+/g, "-").toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

const mapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

const mapsEmbedUrl = (query: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`

const formatLongDate = (d: Date) =>
  d.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

const formatTimeRange = (start: Date, end: Date | null) => {
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(":", ".")
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
}

export default function EventDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const eventId = params?.id
  const { user, token } = useAuth()

  const [event, setEvent] = React.useState<Event | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const [selectedTtId, setSelectedTtId] = React.useState<string | null>(null)
  const [quantity, setQuantity] = React.useState(1)

  const fetchEvent = React.useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_URL}/api/events/${eventId}`)
      const data = await res.json()
      if (data?.success) {
        const e = data.data.event as Event
        setEvent(e)
        const firstAvail = e.ticket_types?.find((t) => ticketStatus(t) === "available")
        if (firstAvail) setSelectedTtId(firstAvail.id)
      } else {
        setError(data?.message || "Event not found.")
      }
    } catch {
      setError("Couldn't reach the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  React.useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const handleRegister = async () => {
    if (!user || !token) {
      router.push(`/auth/login?redirect=/events/${eventId}`)
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data?.success) {
        setEvent(data.data.event)
      } else {
        alert(data?.message || "Couldn't register for this event.")
      }
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleUnregister = async () => {
    if (!user || !token) return
    if (!confirm("Cancel your registration for this event?")) return
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/unregister`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        setEvent(data.data.event)
      } else {
        alert(data?.message || "Couldn't unregister.")
      }
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: `Check out ${event?.title} on MyScope`,
          url: window.location.href,
        })
        return
      } catch {
        // user cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard.")
    } catch {
      // ignore
    }
  }

  const selectedTt = event?.ticket_types?.find((t) => t.id === selectedTtId) ?? null
  const selectedAvailable = selectedTt ? ticketRemaining(selectedTt) : 0
  const selectedMaxQty = selectedTt
    ? Math.max(1, Math.min(selectedTt.per_order_limit ?? 10, selectedAvailable))
    : 1
  const selectedTotal = selectedTt ? Number(selectedTt.price) * quantity : 0

  React.useEffect(() => {
    if (selectedTt && quantity > selectedMaxQty) setQuantity(Math.max(1, selectedMaxQty))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTtId])

  const handleContinueToCheckout = () => {
    if (!selectedTt) return
    if (!user) {
      const redirect = `/events/${eventId}/checkout?tt=${selectedTt.id}&qty=${quantity}`
      router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`)
      return
    }
    router.push(`/events/${eventId}/checkout?tt=${selectedTt.id}&qty=${quantity}`)
  }

  if (loading) return <DetailSkeleton />

  if (error || !event) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold">Event not found</h1>
        <p className="text-muted-foreground">{error || "This event may have been removed or never existed."}</p>
        <Button asChild variant="outline">
          <Link href="/events">
            <ArrowLeft /> Back to events
          </Link>
        </Button>
      </div>
    )
  }

  const ticketsAvailable = event.tickets_available ?? 0
  const ticketsSold = event.tickets_sold ?? 0
  const ticketsRemaining = ticketsAvailable - ticketsSold
  const isSoldOut = ticketsAvailable > 0 && ticketsRemaining <= 0
  const isRegistered = !!user && event.attendees?.includes(user.id)
  const whenIso = event.start_time || event.date
  const dateObj = whenIso ? new Date(whenIso) : null
  const endObj = event.end_time ? new Date(event.end_time) : null
  const venue = event.venue_name || event.location
  const hasTicketTypes = !!event.ticket_types && event.ticket_types.length > 0
  const minTierPrice = hasTicketTypes
    ? Math.min(...event.ticket_types!.map((t) => Number(t.price)))
    : event.price ?? 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Back link */}
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      {/* Hero banner — clean, no overlay chips */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-muted">
        <div className="relative aspect-21/9">
          {event.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.banner_url}
              alt={event.title}
              className="h-full w-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/20 via-primary/5 to-secondary text-muted-foreground">
              <ImageIcon className="h-16 w-16" />
            </div>
          )}

          {(event.featured || isSoldOut) && (
            <div className="absolute right-4 top-4 flex flex-wrap gap-1.5">
              {event.featured && <Badge variant="warning">Featured</Badge>}
              {isSoldOut && <Badge variant="destructive">Sold out</Badge>}
            </div>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Title block */}
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {event.category && (
                <Badge variant="secondary" className="rounded-full capitalize">
                  {event.category}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {event.title}
            </h1>

            {/* Inline key facts (one row, no card clutter) */}
            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5">
              {dateObj && (
                <div className="flex items-center gap-1.5">
                  <CalendarPlus className="h-4 w-4 text-primary" />
                  <span className="text-foreground">{formatLongDate(dateObj)}</span>
                </div>
              )}
              {dateObj && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-foreground">{formatTimeRange(dateObj, endObj)}</span>
                </div>
              )}
              {venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-foreground">{venue}</span>
                </div>
              )}
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <AddToCalendarButton event={event} />
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 />
                Share
              </Button>
            </div>
          </header>

          {/* About */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">About this event</h2>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {event.description || "No description provided."}
            </p>
          </section>

          {/* Ticket picker */}
          {hasTicketTypes && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Tickets</h2>
                  <p className="text-sm text-muted-foreground">
                    {event.ticket_types!.length} {event.ticket_types!.length === 1 ? "tier" : "tiers"} available
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {event.ticket_types!.map((tt) => (
                  <TicketTypeOption
                    key={tt.id}
                    ticket={tt}
                    selected={selectedTtId === tt.id}
                    onSelect={() => setSelectedTtId(tt.id)}
                  />
                ))}
              </ul>

              {selectedTt && (
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Quantity
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-foreground">
                      {selectedTt.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus />
                    </Button>
                    <span className="min-w-10 text-center text-lg font-semibold text-foreground">
                      {quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.min(selectedMaxQty, q + 1))}
                      disabled={quantity >= selectedMaxQty}
                      aria-label="Increase quantity"
                    >
                      <Plus />
                    </Button>
                  </div>
                  <span className="basis-full text-xs text-muted-foreground sm:basis-auto">
                    Max {selectedMaxQty} per order
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Location with map */}
          <VenueMap event={event} />

          {/* Organizer */}
          {event.organizer && (
            <section className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Organizer
                </div>
                <div className="truncate font-semibold text-foreground">{event.organizer.name}</div>
              </div>
            </section>
          )}
        </div>

        {/* Sticky ticket sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-6 shadow-xs">
            {/* Price header */}
            <div className="mb-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {hasTicketTypes ? "Starting from" : "Price"}
              </div>
              <div className="mt-1 text-3xl font-bold text-foreground">
                {formatLkr(minTierPrice ?? 0)}
              </div>
            </div>

            {/* Live order summary */}
            {hasTicketTypes && selectedTt && (
              <div className="mb-5 space-y-3 rounded-lg bg-muted/40 p-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="min-w-0 truncate pr-2 text-muted-foreground">
                    {selectedTt.name} × {quantity}
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {formatLkr(Number(selectedTt.price) * quantity)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    {formatLkr(selectedTotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Capacity (only when no tiers) */}
            {!hasTicketTypes && ticketsAvailable > 0 && (
              <div className="mb-5 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Remaining</span>
                  <span
                    className={cn(
                      "font-semibold",
                      isSoldOut
                        ? "text-destructive"
                        : ticketsRemaining <= 10
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {Math.max(0, ticketsRemaining).toLocaleString()} / {ticketsAvailable.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isSoldOut
                        ? "bg-destructive"
                        : ticketsRemaining <= 10
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                    style={{
                      width: `${ticketsAvailable > 0 ? Math.min(100, (ticketsSold / ticketsAvailable) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="space-y-2">
              {isRegistered ? (
                <>
                  <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>You&rsquo;re registered for this event.</span>
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleUnregister} disabled={busy}>
                    {busy ? "Working…" : "Unregister"}
                  </Button>
                </>
              ) : hasTicketTypes ? (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!selectedTt || isSoldOut}
                  onClick={handleContinueToCheckout}
                >
                  <Ticket /> {isSoldOut ? "Sold out" : "Continue to checkout"}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleRegister}
                  disabled={isSoldOut || busy}
                >
                  <Ticket /> {busy ? "Processing…" : isSoldOut ? "Sold out" : "Register (Free RSVP)"}
                </Button>
              )}
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Secure checkout · Instant e-ticket
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function TicketTypeOption({
  ticket,
  selected,
  onSelect,
}: {
  ticket: TicketType
  selected: boolean
  onSelect: () => void
}) {
  const remaining = ticketRemaining(ticket)
  const status = ticketStatus(ticket)
  const disabled = status !== "available"
  const lowStock = status === "available" && remaining <= 10
  const price = Number(ticket.price)

  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
          disabled && "cursor-not-allowed opacity-60",
          !disabled && selected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/40",
        )}
      >
        <input
          type="radio"
          name="ticket-type-picker"
          checked={selected}
          onChange={onSelect}
          disabled={disabled}
          className="mt-1 accent-primary"
        />
        <div className="flex flex-1 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-foreground">{ticket.name}</div>
            {ticket.description && (
              <div className="mt-0.5 text-sm text-muted-foreground">{ticket.description}</div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">
              {status === "soldout" ? (
                <span className="text-destructive">Sold out</span>
              ) : status === "not_started" ? (
                <span>Sales open {new Date(ticket.sale_start!).toLocaleDateString()}</span>
              ) : status === "ended" ? (
                <span className="text-destructive">Sales ended</span>
              ) : lowStock ? (
                <span className="text-amber-600 dark:text-amber-400">Only {remaining} left</span>
              ) : (
                <span>{remaining} available</span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-base font-bold text-primary">{formatLkr(price)}</div>
          </div>
        </div>
      </label>
    </li>
  )
}

function AddToCalendarButton({ event }: { event: Event }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const calEvent = React.useMemo(() => buildCalendarEvent(event), [event])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  if (!calEvent) return null

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
      >
        <CalendarPlus />
        Add to calendar
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
        >
          <a
            href={googleCalendarUrl(calEvent)}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
            Google Calendar
          </a>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              downloadIcs(calEvent)
              setOpen(false)
            }}
          >
            <Apple className="h-4 w-4 text-muted-foreground" />
            Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  )
}

function VenueMap({ event }: { event: Event }) {
  const venue = event.venue_name
  const address = event.venue_address || event.location
  const query = [venue, address].filter(Boolean).join(", ")
  if (!query) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <MapPin className="h-5 w-5 text-primary" />
          Location
        </h2>
        <div className="mt-2">
          {venue && <div className="font-semibold text-foreground">{venue}</div>}
          {address && address !== venue && (
            <div className="text-sm text-muted-foreground">{address}</div>
          )}
        </div>
        <div className="mt-3">
          <Button asChild variant="outline" size="sm">
            <a href={mapsSearchUrl(query)} target="_blank" rel="noreferrer">
              <Navigation />
              Get directions
            </a>
          </Button>
        </div>
      </div>
      <div className="aspect-16/9 w-full border-t border-border bg-muted">
        <iframe
          title={`Map of ${venue ?? "venue"}`}
          src={mapsEmbedUrl(query)}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mb-8 aspect-21/9 w-full animate-pulse rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-muted lg:col-span-1" />
      </div>
    </div>
  )
}
