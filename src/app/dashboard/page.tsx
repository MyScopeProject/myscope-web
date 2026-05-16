"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Calendar, Ticket, TrendingUp } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { EventCard, type EventCardData } from "@/components/events/event-card"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Stats {
  upcomingEventsCount: number
  registeredCount: number
}

function DashboardContent() {
  const { user } = useAuth()
  const [stats, setStats] = React.useState<Stats>({ upcomingEventsCount: 0, registeredCount: 0 })
  const [upcoming, setUpcoming] = React.useState<EventCardData[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [upcomingRes, myRes] = await Promise.all([
          fetch(`${API_URL}/api/events?upcoming=true&limit=6`, { credentials: "include" }).then((r) => r.json()),
          fetch(`${API_URL}/api/events/my-events`, { credentials: "include" })
            .then((r) => r.json())
            .catch(() => ({ success: false })),
        ])
        if (cancelled) return
        const upcomingList: EventCardData[] = upcomingRes?.data?.events ?? []
        const registered: unknown[] = myRes?.data?.events ?? []
        setUpcoming(upcomingList)
        setStats({
          upcomingEventsCount: upcomingList.length,
          registeredCount: registered.length,
        })
      } catch {
        // soft-fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!user) return null

  const firstName = user.name?.split(" ")[0] ?? "there"

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/10 via-card to-card p-6 shadow-xs sm:p-8">
        <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Hey {firstName} 👋
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Here&rsquo;s what&rsquo;s on around you. Discover new events, manage your tickets, and keep your
          profile up to date.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/events">
              Browse events
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/events">My events</Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Calendar}
          label="Upcoming events"
          value={stats.upcomingEventsCount}
          hint="Available to book"
        />
        <StatCard
          icon={Ticket}
          label="Your registrations"
          value={stats.registeredCount}
          hint="Events you've signed up for"
        />
        <StatCard
          icon={TrendingUp}
          label="Account"
          value={user.role === "user" ? "Member" : user.role}
          hint={user.email}
          isText
        />
      </section>

      {/* Upcoming events */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Upcoming events</h2>
            <p className="text-sm text-muted-foreground">Fresh picks happening soon.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/events">
              View all
              <ArrowRight />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-16/10 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyEvents />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  isText = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  hint?: string
  isText?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={isText ? "mt-1 text-xl font-semibold capitalize text-foreground" : "mt-1 text-3xl font-bold text-foreground"}>
            {value}
          </div>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function EmptyEvents() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Calendar className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">No upcoming events</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Check back soon — organizers add new shows every day.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/events">Browse all events</Link>
      </Button>
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
