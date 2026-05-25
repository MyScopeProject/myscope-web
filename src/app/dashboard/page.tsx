"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Eye,
  MapPin,
  QrCode,
  Search,
  Ticket,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Badge } from "@/components/ui/badge"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface UserEvent {
  id?: string
  _id?: string
  title: string
  date?: string
  start_time?: string
  location?: string
  venue_name?: string
  banner_url?: string | null
  category?: string | null
  status?: string
}

interface BookedEvent {
  id: string
  booking_reference: string
  short_code?: string | null
  number_of_tickets: number
  total_amount: number
  status: string
  checked_in_at?: string | null
  event: {
    title?: string
    date?: string | null
    start_time?: string | null
    location?: string | null
    venue_name?: string | null
  } | null
}

function DashboardContent() {
  const { user, token } = useAuth()

  // My registrations
  const [myEvents, setMyEvents] = React.useState<UserEvent[]>([])
  const [myLoading, setMyLoading] = React.useState(true)
  const [myError, setMyError] = React.useState<string | null>(null)
  const [unregisteringId, setUnregisteringId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  // Booked events (paid event bookings — distinct from free registrations)
  const [booked, setBooked] = React.useState<BookedEvent[]>([])
  const [bookedLoading, setBookedLoading] = React.useState(true)

  // Fetch my registered events
  const fetchMyEvents = React.useCallback(async () => {
    try {
      setMyLoading(true)
      setMyError(null)
      const res = await fetch(`${API_URL}/api/events/user`, { credentials: "include" })
      const data = await res.json()
      setMyEvents(data?.success ? (data.data?.events ?? []) : [])
    } catch {
      setMyError("Couldn't load your events. Please try again.")
    } finally {
      setMyLoading(false)
    }
  }, [])

  const fetchBooked = React.useCallback(async () => {
    try {
      setBookedLoading(true)
      const res = await fetch(`${API_URL}/api/event-bookings`, { credentials: "include" })
      const data = await res.json()
      setBooked(data?.success ? (data.data ?? []) : [])
    } catch {
      // Non-fatal on the overview; the dedicated section surfaces errors.
      setBooked([])
    } finally {
      setBookedLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (token) {
      fetchMyEvents()
      fetchBooked()
    }
  }, [token, fetchMyEvents, fetchBooked])

  const handleUnregister = async (event: UserEvent) => {
    const id = event.id ?? event._id
    if (!id) return
    if (!confirm(`Cancel registration for "${event.title}"?`)) return
    setUnregisteringId(id)
    try {
      const res = await fetch(`${API_URL}/api/events/${id}/unregister`, { method: "POST", credentials: "include" })
      if (res.ok) setMyEvents(prev => prev.filter(e => (e.id ?? e._id) !== id))
      else {
        const data = await res.json().catch(() => null)
        alert(data?.message || "Failed to unregister.")
      }
    } catch { alert("Network error. Please try again.") }
    finally { setUnregisteringId(null) }
  }

  const filtered = React.useMemo(() => {
    if (!search.trim()) return myEvents
    const q = search.toLowerCase()
    return myEvents.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.venue_name?.toLowerCase().includes(q)
    )
  }, [myEvents, search])

  if (!user) return null
  const firstName = user.name?.split(" ")[0] ?? "there"
  const initial = user.name?.charAt(0).toUpperCase() ?? "?"

  return (
    <div className="space-y-10">

      {/* Greeting */}
      <section className="flex items-center gap-4">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-primary/10">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name ?? "Profile"}
              fill
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
              {initial}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Hey, {firstName}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </section>

      {/* Booked events preview */}
      {(bookedLoading || booked.length > 0) && (
        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Booked events</h2>
              <p className="text-sm text-muted-foreground">Your tickets &amp; QR codes</p>
            </div>
            <Link
              href="/dashboard/booked-events"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {bookedLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {booked.slice(0, 3).map((b) => {
                const when = b.event?.start_time || b.event?.date
                const dateObj = when ? new Date(when) : null
                const variant =
                  b.status === "Confirmed" ? "success"
                  : b.status === "Pending" ? "warning"
                  : b.status === "Cancelled" || b.status === "Refunded" ? "destructive"
                  : "outline"
                return (
                  <li key={b.id}>
                    <Link
                      href="/dashboard/booked-events"
                      className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:bg-muted/40"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <QrCode className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant={variant} className="text-xs">
                            {b.status === "Pending" ? "Payment pending" : b.status}
                          </Badge>
                          {b.checked_in_at && <Badge variant="outline" className="text-xs">Checked in</Badge>}
                        </div>
                        <p className="truncate font-semibold text-foreground">{b.event?.title ?? "Event"}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {dateObj && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Ticket className="h-3 w-3" />
                            {b.number_of_tickets} ticket{b.number_of_tickets === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* My registrations */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">My registrations</h2>
            <p className="text-sm text-muted-foreground">Events you&rsquo;ve signed up for</p>
          </div>
          {myEvents.length > 0 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-40 rounded-lg border border-border bg-card pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-52"
              />
            </div>
          )}
        </div>

        {myLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />)}
          </div>
        ) : myError ? (
          <ErrorState message={myError} onRetry={fetchMyEvents} />
        ) : filtered.length === 0 ? (
          <EmptyState hasSearch={!!search} />
        ) : (
          <ul className="space-y-3">
            {filtered.map(event => {
              const id = event.id ?? event._id ?? ""
              const when = event.start_time || event.date
              const dateObj = when ? new Date(when) : null
              const venue = event.venue_name || event.location
              return (
                <li key={id} className="flex overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                  {/* Thumbnail */}
                  <div className="relative hidden w-28 shrink-0 overflow-hidden bg-muted sm:block">
                    {event.banner_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.banner_url} alt="" className="h-full w-full object-cover"
                        onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">🎫</div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-1 items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        {event.category && <Badge variant="default" className="text-xs">{event.category}</Badge>}
                        {event.status && <Badge variant="outline" className="capitalize text-xs">{event.status}</Badge>}
                      </div>
                      <p className="truncate font-semibold text-foreground">{event.title}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {dateObj && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                        {venue && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {venue}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/events/${id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleUnregister(event)}
                        disabled={unregisteringId === id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" />
                        {unregisteringId === id ? "Cancelling…" : "Unregister"}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

    </div>
  )
}


function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Ticket className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {hasSearch ? "No matches" : "No registrations yet"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasSearch ? "Try a different search term." : "Browse events and grab your first ticket."}
        </p>
      </div>
      {!hasSearch && (
        <Link href="/events"
          className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
          Browse events
        </Link>
      )}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">Couldn&rsquo;t load events</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
      <button type="button" onClick={onRetry}
        className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
        Try again
      </button>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
