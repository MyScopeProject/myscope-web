"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  QrCode,
  Ticket,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Badge } from "@/components/ui/badge"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type BookingStatus = "Pending" | "Confirmed" | "Cancelled" | "Refunded" | string

interface EventLite {
  id: string
  title: string
  date?: string | null
  start_time?: string | null
  location?: string | null
  venue_name?: string | null
  banner_url?: string | null
  image?: string | null
  category?: string | null
  seating_mode?: "none" | "free" | "zoned" | "reserved" | null
}

interface BookingRow {
  id: string
  booking_reference: string
  short_code?: string | null
  number_of_tickets: number
  ticket_price: number
  total_amount: number
  status: BookingStatus
  payment_status: string
  ticket_url?: string | null
  checked_in_at?: string | null
  created_at: string
  event: EventLite | null
}

interface SeatTicket {
  id: string
  qr_image_url: string | null
  check_in_status?: string
  checked_in_at?: string | null
  seat?: { seat_label?: string; section?: string; row_label?: string; seat_number?: string } | null
}

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  Confirmed: { label: "Confirmed", variant: "success" },
  Pending: { label: "Payment pending", variant: "warning" },
  Cancelled: { label: "Cancelled", variant: "destructive" },
  Refunded: { label: "Refunded", variant: "destructive" },
}

const FILTERS = ["All", "Confirmed", "Pending", "Cancelled"] as const
type Filter = (typeof FILTERS)[number]

const lkr = (n: number) => `LKR ${Number(n || 0).toLocaleString()}`

function BookedEventsContent() {
  const { user, token } = useAuth()
  const [bookings, setBookings] = React.useState<BookingRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<Filter>("All")

  const fetchBookings = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_URL}/api/event-bookings`, { credentials: "include" })
      const data = await res.json()
      setBookings(data?.success ? (data.data ?? []) : [])
    } catch {
      setError("Couldn't load your booked events. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (token) fetchBookings()
  }, [token, fetchBookings])

  const counts = React.useMemo(() => {
    const c = { All: bookings.length, Confirmed: 0, Pending: 0, Cancelled: 0 }
    for (const b of bookings) {
      if (b.status === "Confirmed") c.Confirmed++
      else if (b.status === "Pending") c.Pending++
      else if (b.status === "Cancelled" || b.status === "Refunded") c.Cancelled++
    }
    return c
  }, [bookings])

  const visible = React.useMemo(() => {
    if (filter === "All") return bookings
    if (filter === "Cancelled") return bookings.filter((b) => b.status === "Cancelled" || b.status === "Refunded")
    return bookings.filter((b) => b.status === filter)
  }, [bookings, filter])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Booked events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your event tickets — booking details and QR codes for entry, all in one place.
        </p>
      </div>

      {/* Filters */}
      {bookings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f
            const count = counts[f as keyof typeof counts]
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted")
                }
              >
                {f}
                <span className={active ? "text-primary" : "text-muted-foreground/70"}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={fetchBookings}
            className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Ticket className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {filter === "All" ? "No booked events yet" : `No ${filter.toLowerCase()} bookings`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter === "All" ? "When you book an event, your tickets and QR codes show up here." : "Try a different filter."}
            </p>
          </div>
          {filter === "All" && (
            <Link
              href="/events"
              className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Browse events
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </ul>
      )}
    </div>
  )
}

function BookingCard({ booking }: { booking: BookingRow }) {
  const ev = booking.event
  const when = ev?.start_time || ev?.date
  const dateObj = when ? new Date(when) : null
  const venue = ev?.venue_name || ev?.location
  const banner = ev?.banner_url || ev?.image
  const meta = STATUS_META[booking.status] ?? { label: booking.status, variant: "outline" as const }
  const isConfirmed = booking.status === "Confirmed"
  const isReserved = ev?.seating_mode === "reserved"

  const [showQr, setShowQr] = React.useState(false)
  const [seatTickets, setSeatTickets] = React.useState<SeatTicket[] | null>(null)
  const [loadingTickets, setLoadingTickets] = React.useState(false)
  const [ticketsError, setTicketsError] = React.useState("")

  const toggleQr = async () => {
    const next = !showQr
    setShowQr(next)
    // Lazy-load per-seat tickets for reserved events the first time we expand.
    if (next && isReserved && seatTickets === null && !loadingTickets) {
      setLoadingTickets(true)
      setTicketsError("")
      try {
        const res = await fetch(`${API_URL}/api/checkout/${booking.id}/tickets`, { credentials: "include" })
        const data = await res.json()
        if (data?.success) setSeatTickets(data.data?.tickets ?? [])
        else setTicketsError(data?.message || "Couldn't load your seat tickets.")
      } catch {
        setTicketsError("Network error loading seat tickets.")
      } finally {
        setLoadingTickets(false)
      }
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex">
        {/* Thumbnail */}
        <div className="relative hidden w-32 shrink-0 overflow-hidden bg-muted sm:block">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">🎫</div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={meta.variant} className="text-xs">{meta.label}</Badge>
            {ev?.category && <Badge variant="outline" className="text-xs">{ev.category}</Badge>}
            {booking.checked_in_at && (
              <Badge variant="success" className="text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Checked in
              </Badge>
            )}
          </div>

          <p className="mt-1.5 truncate text-base font-semibold text-foreground">
            {ev?.title ?? "Event no longer available"}
          </p>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {dateObj && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dateObj.toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
            {venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {venue}
              </span>
            )}
          </div>

          {/* Booking details */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
            <Detail label="Booking code" value={booking.short_code || booking.booking_reference} mono />
            <Detail label="Tickets" value={String(booking.number_of_tickets)} />
            <Detail label="Total paid" value={lkr(booking.total_amount)} />
            <Detail
              label="Booked on"
              value={new Date(booking.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            />
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isConfirmed && (
              <button
                type="button"
                onClick={toggleQr}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <QrCode className="h-3.5 w-3.5" />
                {showQr ? "Hide QR" : "Show QR ticket"}
                <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (showQr ? "rotate-180" : "")} />
              </button>
            )}
            {booking.status === "Pending" && (
              <Link
                href={`/bookings/event/${booking.id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-500/90"
              >
                <Clock className="h-3.5 w-3.5" /> Complete payment
              </Link>
            )}
            <Link
              href={`/bookings/event/${booking.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Manage / download
            </Link>
          </div>
        </div>
      </div>

      {/* QR panel */}
      {isConfirmed && showQr && (
        <div className="border-t border-border bg-muted/20 p-4">
          {isReserved ? (
            loadingTickets ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your seat tickets…
              </div>
            ) : ticketsError ? (
              <p className="py-4 text-center text-sm text-destructive">{ticketsError}</p>
            ) : seatTickets && seatTickets.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {seatTickets.map((t) => (
                  <QrTile
                    key={t.id}
                    url={t.qr_image_url}
                    label={t.seat?.seat_label || [t.seat?.section, t.seat?.row_label && `${t.seat.row_label}${t.seat.seat_number ?? ""}`].filter(Boolean).join(" ") || "Seat"}
                    used={t.check_in_status === "used" || !!t.checked_in_at}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No seat tickets found for this booking.</p>
            )
          ) : booking.ticket_url ? (
            <div className="flex flex-col items-center gap-2">
              <QrTile url={booking.ticket_url} label={`${booking.number_of_tickets} ticket${booking.number_of_tickets === 1 ? "" : "s"}`} used={!!booking.checked_in_at} />
              <p className="text-center text-xs text-muted-foreground">Show this QR at the gate. One scan admits your whole booking.</p>
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              Your QR ticket is being generated.{" "}
              <Link href={`/bookings/event/${booking.id}`} className="font-medium text-primary hover:underline">
                Open the ticket page
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function QrTile({ url, label, used }: { url: string | null; label: string; used?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative rounded-lg border border-border bg-white p-2">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`QR code — ${label}`} className="h-32 w-32 object-contain" />
          </a>
        ) : (
          <div className="flex h-32 w-32 items-center justify-center text-muted-foreground">
            <QrCode className="h-8 w-8" />
          </div>
        )}
        {used && (
          <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 rounded bg-destructive/90 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">
            Used
          </span>
        )}
      </div>
      <span className="max-w-32 truncate text-center text-xs font-medium text-foreground">{label}</span>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"truncate text-foreground " + (mono ? "font-mono" : "font-medium")}>{value}</div>
    </div>
  )
}

export default function BookedEventsPage() {
  return (
    <ProtectedRoute>
      <BookedEventsContent />
    </ProtectedRoute>
  )
}
