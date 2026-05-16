"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Edit3,
  FileText,
  Loader,
  MapPin,
  Plus,
  Search,
  Send,
  Ticket,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type ApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled"

interface EventRow {
  id: string
  title: string
  description: string | null
  category: string | null
  venue_name: string | null
  start_time: string | null
  date: string | null
  approval_status: ApprovalStatus
  rejection_reason: string | null
  created_at: string
  banner_url?: string | null
}

const STATUS_META: Record<
  ApprovalStatus,
  { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: { label: "Draft", variant: "outline", icon: FileText },
  pending: { label: "Under review", variant: "warning", icon: Clock },
  approved: { label: "Live", variant: "success", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: XCircle },
}

const STATUS_FILTERS: Array<{ value: "all" | ApprovalStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Live" },
  { value: "rejected", label: "Rejected" },
]

export default function OrganizerEventsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [events, setEvents] = React.useState<EventRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submittingId, setSubmittingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | ApprovalStatus>("all")

  // Auth guard
  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?redirect=/organizer/events")
      return
    }
    if (!["organizer", "superadmin"].includes(user.role || "")) {
      router.push("/become-organizer")
    }
  }, [authLoading, user, router])

  const fetchEvents = React.useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/organizer/events`, { credentials: "include" })
      const data = await res.json()
      if (data?.success) {
        setEvents(data.data?.events ?? [])
      } else {
        setError(data?.message || "Failed to load events.")
      }
    } catch {
      setError("Network error loading events.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (user && ["organizer", "superadmin"].includes(user.role || "")) {
      fetchEvents()
    }
  }, [user, fetchEvents])

  const handleSubmit = async (id: string) => {
    if (!confirm("Submit this event for admin review? You won't be able to edit it while pending.")) return
    setSubmittingId(id)
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${id}/submit`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        await fetchEvents()
      } else {
        alert(data?.message || "Failed to submit.")
      }
    } finally {
      setSubmittingId(null)
    }
  }

  const filtered = React.useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== "all" && e.approval_status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          e.title?.toLowerCase().includes(q) ||
          e.venue_name?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [events, statusFilter, search])

  // Counts per status for the filter tabs
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: events.length }
    for (const e of events) c[e.approval_status] = (c[e.approval_status] ?? 0) + 1
    return c
  }, [events])

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts stay private. Live events show up on MyScope.
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/events/create">
            <Plus /> Create event
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-xs">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value
          const n = counts[f.value] ?? 0
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {n}
              </span>
            </button>
          )
        })}
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

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={statusFilter !== "all" || !!search} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((event) => (
            <OrganizerEventRow
              key={event.id}
              event={event}
              submitting={submittingId === event.id}
              onSubmit={() => handleSubmit(event.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function OrganizerEventRow({
  event,
  onSubmit,
  submitting,
}: {
  event: EventRow
  onSubmit: () => void
  submitting: boolean
}) {
  const meta = STATUS_META[event.approval_status] ?? STATUS_META.draft
  const Icon = meta.icon
  const when = event.start_time || event.date
  const dateObj = when ? new Date(when) : null
  const canEdit = event.approval_status === "draft" || event.approval_status === "rejected"
  const canSubmit = canEdit

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-col gap-0 sm:flex-row">
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
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/15 via-primary/5 to-secondary text-primary/60">
              <Ticket className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3 p-4 sm:py-5 sm:pr-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={meta.variant}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </Badge>
            {event.category && (
              <Badge variant="outline" className="capitalize">
                {event.category}
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
            {event.venue_name && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {event.venue_name}
              </span>
            )}
          </div>

          {event.approval_status === "rejected" && event.rejection_reason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span className="font-semibold">Rejection reason: </span>
              {event.rejection_reason}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-1">
            {event.approval_status === "approved" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/organizer/events/${event.id}/analytics`}>
                  <BarChart2 /> Analytics
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/organizer/events/${event.id}/edit`}>
                  <Edit3 /> Edit
                </Link>
              </Button>
            )}
            {canSubmit && (
              <Button size="sm" onClick={onSubmit} disabled={submitting}>
                {submitting ? <Loader className="animate-spin" /> : <Send />}
                Submit for review
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Ticket className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        {hasFilters ? "No events match your filters" : "No events yet"}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try clearing the search or switching tabs."
          : "Spin up your first draft and submit it for review when ready."}
      </p>
      <Button asChild className="mt-2">
        <Link href="/organizer/events/create">
          <Plus /> Create event
        </Link>
      </Button>
    </div>
  )
}
