"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle,
  Clock,
  FileText,
  Loader,
  Plus,
  Ticket,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface DashboardData {
  event_counts: {
    draft: number
    pending: number
    approved: number
    rejected: number
    cancelled: number
  }
  totals: { revenue: number; tickets: number; bookings: number; checked_in: number }
  top_events: {
    event_id: string
    title: string
    revenue: number
    tickets: number
    bookings: number
  }[]
  recent_bookings: {
    id: string
    booking_reference: string
    event_title: string
    number_of_tickets: number
    total_amount: number | string
    attendee_name: string | null
    created_at: string
  }[]
}

interface Balance {
  pending: number
  net: number
  gross: number
  paid_out: number
  platform_fee_pct: number
}

const STATUS_META: Record<
  keyof DashboardData["event_counts"],
  { label: string; tone: "default" | "warning" | "success" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: { label: "Drafts", tone: "outline", icon: FileText },
  pending: { label: "Pending", tone: "warning", icon: Clock },
  approved: { label: "Live", tone: "success", icon: CheckCircle },
  rejected: { label: "Rejected", tone: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", tone: "outline", icon: XCircle },
}

const formatLkr = (n: number | string) => {
  const v = typeof n === "string" ? Number(n) : n
  return `LKR ${(v || 0).toLocaleString()}`
}

export default function OrganizerDashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [data, setData] = React.useState<DashboardData | null>(null)
  const [balance, setBalance] = React.useState<Balance | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  // Auth + role guard
  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/auth/login?redirect=/organizer")
      return
    }
    if (user.role !== "organizer" && user.role !== "superadmin") {
      router.replace("/become-organizer")
    }
  }, [authLoading, user, router])

  React.useEffect(() => {
    if (!user || (user.role !== "organizer" && user.role !== "superadmin")) return
    Promise.all([
      fetch(`${API_URL}/api/organizer/events/dashboard`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API_URL}/api/organizer/payouts/balance`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([dashRes, balRes]) => {
        if (!dashRes?.success) {
          setError(dashRes?.message || "Failed to load dashboard.")
          return
        }
        setData(dashRes.data as DashboardData)
        if (balRes?.success) setBalance(balRes.data.balance)
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-base font-semibold text-foreground">Couldn&rsquo;t load dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  const firstName = user?.name?.split(" ")[0] ?? "there"

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/10 via-card to-card p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Organizer dashboard</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Hey {firstName} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Quick view of your events, bookings, revenue, and pending payouts.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/organizer/events/create">
              <Plus /> Create event
            </Link>
          </Button>
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Gross revenue"
          value={formatLkr(data.totals.revenue)}
          hint={`${data.totals.bookings} bookings`}
        />
        <KpiCard
          icon={Ticket}
          label="Tickets sold"
          value={data.totals.tickets.toLocaleString()}
          hint="across all events"
        />
        <KpiCard
          icon={Users}
          label="Checked in"
          value={data.totals.checked_in.toLocaleString()}
          hint="at the door"
        />
        <KpiCard
          icon={Banknote}
          label="Pending payout"
          value={balance ? formatLkr(balance.pending) : "—"}
          hint={balance ? `Platform fee ${(balance.platform_fee_pct * 100).toFixed(1)}%` : undefined}
        />
      </section>

      {/* Event-status grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Events by status
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(STATUS_META) as Array<keyof DashboardData["event_counts"]>).map((key) => {
            const meta = STATUS_META[key]
            const Icon = meta.icon
            const count = data.event_counts[key] ?? 0
            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wider">{meta.label}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">{count}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Two-column: Top events + Recent bookings */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top events */}
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Top events by revenue</h3>
            <Button asChild variant="ghost" size="sm">
              <Link href="/organizer/events">
                All <ArrowRight />
              </Link>
            </Button>
          </div>
          {data.top_events.length === 0 ? (
            <EmptyRow text="No revenue data yet." />
          ) : (
            <ul className="divide-y divide-border">
              {data.top_events.map((e) => (
                <li key={e.event_id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <Link
                      href={`/organizer/events/${e.event_id}/analytics`}
                      className="line-clamp-1 text-sm font-medium text-foreground hover:text-primary"
                    >
                      {e.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {e.tickets} tickets · {e.bookings} bookings
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-foreground">{formatLkr(e.revenue)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent bookings */}
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Recent bookings</h3>
          </div>
          {data.recent_bookings.length === 0 ? (
            <EmptyRow text="No bookings yet." />
          ) : (
            <ul className="divide-y divide-border">
              {data.recent_bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-medium text-foreground">
                      {b.event_title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.attendee_name ?? "Anonymous"} · {b.booking_reference} ·{" "}
                      {b.number_of_tickets} ticket{b.number_of_tickets === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {formatLkr(b.total_amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Payout snapshot */}
      {balance && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge>Payouts</Badge>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                {formatLkr(balance.pending)} pending
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Net after platform fee &amp; refunds. Paid out weekly.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/organizer/payouts">
                <Banknote /> View payouts
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5 text-sm">
            <BalanceMetric label="Gross" value={formatLkr(balance.gross)} />
            <BalanceMetric label="Net" value={formatLkr(balance.net)} />
            <BalanceMetric label="Paid out" value={formatLkr(balance.paid_out)} />
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-primary/60" />
        <h2 className="mt-2 text-base font-semibold text-foreground">Ready to launch another show?</h2>
        <p className="text-sm text-muted-foreground">Spin up a new event in under five minutes.</p>
        <Button asChild className="mt-4">
          <Link href="/organizer/events/create">
            <Plus /> Create event
          </Link>
        </Button>
      </section>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function BalanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-base font-semibold text-foreground")}>{value}</div>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>
}
