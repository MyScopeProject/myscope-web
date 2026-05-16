"use client"

import * as React from "react"
import Link from "next/link"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
  price?: number
  tickets_available?: number
  tickets_sold?: number
}

function MyEventsContent() {
  const { token } = useAuth()
  const [events, setEvents] = React.useState<UserEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [unregisteringId, setUnregisteringId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  const fetchUserEvents = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_URL}/api/events/user`, { credentials: "include" })
      const data = await res.json()
      if (data?.success && data.data?.events) {
        setEvents(data.data.events)
      } else {
        setEvents([])
      }
    } catch {
      setError("Couldn't load your events. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (token) fetchUserEvents()
  }, [token, fetchUserEvents])

  const handleUnregister = async (event: UserEvent) => {
    const id = event.id ?? event._id
    if (!id) return
    if (!confirm(`Cancel your registration for "${event.title}"?`)) return

    setUnregisteringId(id)
    try {
      const res = await fetch(`${API_URL}/api/events/${id}/unregister`, {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => (e.id ?? e._id) !== id))
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.message || "Failed to unregister.")
      }
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setUnregisteringId(null)
    }
  }

  const filtered = React.useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.venue_name?.toLowerCase().includes(q),
    )
  }, [events, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Events you&rsquo;re registered for or have booked tickets to.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/events">
            <Ticket /> Browse more
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search your events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        />
      </div>

      {/* List */}
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUserEvents} />
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((event) => {
            const id = event.id ?? event._id ?? ""
            const when = event.start_time || event.date
            const dateObj = when ? new Date(when) : null
            const venue = event.venue_name || event.location

            return (
              <li
                key={id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  {/* Banner thumbnail */}
                  <div className="relative aspect-21/9 w-full shrink-0 overflow-hidden bg-muted sm:aspect-auto sm:h-auto sm:w-40">
                    {event.banner_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.banner_url}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/20 via-primary/5 to-secondary text-3xl">
                        🎫
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-3 p-4 sm:py-5 sm:pr-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {event.category && <Badge variant="default">{event.category}</Badge>}
                      {event.status && (
                        <Badge variant="outline" className="capitalize">
                          {event.status}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-base font-semibold leading-tight text-foreground sm:text-lg">
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {dateObj && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {dateObj.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {venue && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {venue}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/events/${id}`}>
                          <Eye /> View
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUnregister(event)}
                        disabled={unregisteringId === id}
                      >
                        <Trash2 />
                        {unregisteringId === id ? "Cancelling…" : "Unregister"}
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className={cn("h-32 animate-pulse rounded-xl border border-border bg-card sm:h-28")}
        />
      ))}
    </ul>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Ticket className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        {hasSearch ? "No matches" : "You haven't registered for any events yet"}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasSearch
          ? "Try a different search term."
          : "Browse what's on and grab tickets to your next experience."}
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/events">Browse events</Link>
      </Button>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">Couldn&rsquo;t load events</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

export default function DashboardEventsPage() {
  return (
    <ProtectedRoute>
      <MyEventsContent />
    </ProtectedRoute>
  )
}
