"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle,
  Clock,
  Loader,
  Plus,
  Ticket,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { ContactCollaborate } from "@/components/organizer/contact-collaborate"

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

// Drafts tile omitted — the draft flow has been removed from the product.
// The API still returns a `draft` count for back-compat, but it's not surfaced
// in the dashboard summary.
const STATUS_META: Record<
  Exclude<keyof DashboardData["event_counts"], "draft">,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  pending: { label: "Pending", icon: Clock, tone: "text-amber-600 dark:text-amber-400" },
  approved: { label: "Live", icon: CheckCircle, tone: "text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "Rejected", icon: XCircle, tone: "text-destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, tone: "text-muted-foreground" },
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
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-base font-semibold text-foreground">Couldn&rsquo;t load dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  const firstName = user?.name?.split(" ")[0] ?? "there"
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {today}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {firstName}
          </h1>
        </div>
        <Button asChild>
          <Link href="/organizer/events/create">
            <Plus /> Create event
          </Link>
        </Button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Revenue"
          value={formatLkr(data.totals.revenue)}
          hint={`${data.totals.bookings.toLocaleString()} bookings`}
        />
        <KpiCard
          icon={Ticket}
          label="Tickets sold"
          value={data.totals.tickets.toLocaleString()}
          hint="all-time"
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
          hint={balance ? `${(balance.platform_fee_pct * 100).toFixed(1)}% platform fee` : undefined}
        />
      </section>

      {/* Events status strip */}
      <section className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Events overview</h2>
          <Link
            href="/organizer/events"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Manage all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((key) => {
            const meta = STATUS_META[key]
            const Icon = meta.icon
            const count = data.event_counts[key] ?? 0
            return (
              <div key={key} className="px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.tone}`} />
                  <span className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">{meta.label}</span>
                </div>
                <div className="mt-1 text-lg sm:text-xl font-bold text-foreground">{count}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Contact & collaborate with the MyScope team */}
      <ContactCollaborate subtitle="connect with us for your event procedure." />

      {/* Top events + Recent bookings */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top events */}
        <div className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">Top events</h3>
            <span className="text-xs text-muted-foreground">by revenue</span>
          </div>
          {data.top_events.length === 0 ? (
            <EmptyRow text="No revenue data yet." />
          ) : (
            <ul className="divide-y divide-border">
              {data.top_events.slice(0, 5).map((e, idx) => (
                <li key={e.event_id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/organizer/events/${e.event_id}`}
                      className="line-clamp-1 text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {e.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {e.tickets.toLocaleString()} tickets · {e.bookings.toLocaleString()} bookings
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-foreground">
                    {formatLkr(e.revenue)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent bookings */}
        <div className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">Recent bookings</h3>
            <span className="text-xs text-muted-foreground">latest 5</span>
          </div>
          {data.recent_bookings.length === 0 ? (
            <EmptyRow text="No bookings yet." />
          ) : (
            <ul className="divide-y divide-border">
              {data.recent_bookings.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-medium text-foreground">
                      {b.event_title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {b.attendee_name ?? "Anonymous"} ·{" "}
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

      {/* Payout summary */}
      {balance && (
        <section className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">Payouts</h3>
            <Button asChild variant="outline" size="sm">
              <Link href="/organizer/payouts">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <BalanceMetric label="Pending" value={formatLkr(balance.pending)} accent />
            <BalanceMetric label="Gross" value={formatLkr(balance.gross)} />
            <BalanceMetric label="Net" value={formatLkr(balance.net)} />
            <BalanceMetric label="Paid out" value={formatLkr(balance.paid_out)} />
          </div>
        </section>
      )}
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
    <div className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-4 sm:p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">{label}</span>
      </div>
      {/* truncate guards against long currency strings (e.g. "LKR 12,345,678")
          breaking the 2-col mobile layout. */}
      <div className="mt-2 truncate text-xl sm:text-2xl font-bold leading-tight text-foreground">{value}</div>
      {hint && <p className="mt-1 truncate text-[11px] sm:text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function BalanceMetric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4">
      <div className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </div>
      <div
        className={
          accent
            ? "mt-1 truncate text-base sm:text-lg font-bold text-foreground"
            : "mt-1 truncate text-sm sm:text-base font-semibold text-foreground"
        }
      >
        {value}
      </div>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>
}

