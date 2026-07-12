"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import toast from "react-hot-toast"
import {
  AlertCircle,
  Calendar,
  Eye,
  MapPin,
  Search,
  Ticket,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Badge } from "@/components/ui/badge"
import { BookedEventsList } from "@/components/dashboard/booked-events-list"
import { ShopOrdersSection } from "@/components/dashboard/shop-orders-section"

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

function DashboardContent() {
  const { user, token } = useAuth()

  // My registrations
  const [myEvents, setMyEvents] = React.useState<UserEvent[]>([])
  const [myLoading, setMyLoading] = React.useState(true)
  const [myError, setMyError] = React.useState<string | null>(null)
  const [unregisteringId, setUnregisteringId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  // Fetch my registered events (legacy free-RSVP feature — only shown when the
  // user actually has registrations; paid bookings live in BookedEventsList).
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

  React.useEffect(() => {
    if (token) fetchMyEvents()
  }, [token, fetchMyEvents])

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
        toast.error(data?.message || "Failed to unregister.")
      }
    } catch { toast.error("Network error. Please try again.") }
    finally { setUnregisteringId(null) }
  }

  // Drop past registrations — My Events focuses on upcoming/active. The
  // booked-events list above applies the richer "scanned + 3 days" archive
  // rule; legacy registrations don't carry attendance data, so a simple
  // start-time-before-now check is the right cutoff here.
  const upcomingEvents = React.useMemo(() => {
    const now = Date.now()
    return myEvents.filter(e => {
      const when = e.start_time || e.date
      if (!when) return true  // missing date → keep visible, can't determine
      const t = new Date(when).getTime()
      return Number.isNaN(t) || t >= now
    })
  }, [myEvents])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return upcomingEvents
    const q = search.toLowerCase()
    return upcomingEvents.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.venue_name?.toLowerCase().includes(q)
    )
  }, [upcomingEvents, search])

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

      {/* Booked events — the user's tickets + QR codes (paid bookings) */}
      <BookedEventsList />

      {/* Shop orders — self-hides when the user has no shop history yet. */}
      <ShopOrdersSection />

      {/* My registrations */}
      {upcomingEvents.length > 0 && (
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">My registrations</h2>
            <p className="text-sm text-muted-foreground">Events you&rsquo;ve signed up for</p>
          </div>
          {upcomingEvents.length > 0 && (
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
            {[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm" />)}
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
                <li key={id} className="flex overflow-hidden rounded-xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm shadow-xs">
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
      )}

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
