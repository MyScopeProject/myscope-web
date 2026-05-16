"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  BarChart2,
  CheckCircle,
  Download,
  Loader,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface TicketTypeStat {
  id: string
  name: string
  price: number
  quantity: number
  sold: number
  revenue: number
  checked_in: number
}

interface Attendee {
  id: string
  booking_reference: string
  ticket_type_id: string | null
  number_of_tickets: number
  total_amount: number | string
  attendee_info: { name?: string; email?: string; phone?: string | null } | null
  checked_in_at: string | null
  created_at: string
}

interface AnalyticsData {
  event: {
    id: string
    title: string
    start_time: string | null
    venue_name: string | null
    approval_status: string
  }
  summary: {
    total_revenue: number
    total_sold: number
    total_capacity: number
    total_checked_in: number
    occupancy_pct: number
  }
  ticket_types: TicketTypeStat[]
  attendees: Attendee[]
}

const formatLkr = (n: number | string) => {
  const v = typeof n === "string" ? Number(n) : n
  return `LKR ${(v || 0).toLocaleString()}`
}

export default function OrganizerAnalyticsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const eventId = params?.id
  const { user, loading: authLoading } = useAuth()

  const [data, setData] = React.useState<AnalyticsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (authLoading) return
    if (!user) router.push("/auth/login")
  }, [authLoading, user, router])

  React.useEffect(() => {
    if (!user || !eventId) return
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/analytics`, {
          credentials: "include",
        })
        const body = await res.json()
        if (!body?.success) {
          setError(body?.message || "Failed to load analytics.")
          return
        }
        setData(body.data as AnalyticsData)
      } catch {
        setError("Network error.")
      } finally {
        setLoading(false)
      }
    })()
  }, [user, eventId])

  const exportCsv = () => {
    if (!data) return
    const ttMap = Object.fromEntries(data.ticket_types.map((tt) => [tt.id, tt.name]))
    const rows = [
      ["Booking Ref", "Name", "Email", "Phone", "Ticket Type", "Qty", "Amount (LKR)", "Checked In", "Booked At"],
      ...data.attendees.map((a) => [
        a.booking_reference,
        a.attendee_info?.name ?? "",
        a.attendee_info?.email ?? "",
        a.attendee_info?.phone ?? "",
        a.ticket_type_id ? ttMap[a.ticket_type_id] ?? "" : "",
        String(a.number_of_tickets),
        String(Number(a.total_amount).toFixed(2)),
        a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : "No",
        new Date(a.created_at).toLocaleString(),
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendees-${data.event.title.replace(/\s+/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        <h2 className="text-base font-semibold text-foreground">Couldn&rsquo;t load analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error || "No data found."}</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/organizer/events">Back to events</Link>
        </Button>
      </div>
    )
  }

  const { event, summary, ticket_types, attendees } = data
  const ttMap = Object.fromEntries(ticket_types.map((tt) => [tt.id, tt.name]))

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge>Analytics</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {event.title}
          </h1>
          {event.start_time && (
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(event.start_time).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {event.venue_name && ` · ${event.venue_name}`}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={attendees.length === 0}>
          <Download /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Revenue"
          value={formatLkr(summary.total_revenue)}
        />
        <StatCard
          icon={Ticket}
          label="Tickets sold"
          value={`${summary.total_sold} / ${summary.total_capacity}`}
          hint={`${summary.occupancy_pct}% full`}
        />
        <StatCard
          icon={Users}
          label="Bookings"
          value={attendees.length.toLocaleString()}
        />
        <StatCard
          icon={CheckCircle}
          label="Checked in"
          value={`${summary.total_checked_in} / ${summary.total_sold}`}
          hint={
            summary.total_sold > 0
              ? `${Math.round((summary.total_checked_in / summary.total_sold) * 100)}%`
              : "—"
          }
          tone="success"
        />
      </section>

      {/* Ticket type breakdown */}
      {ticket_types.length > 0 && (
        <section className="rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart2 className="h-4 w-4 text-primary" /> Ticket-type breakdown
            </h2>
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
                {ticket_types.map((tt) => {
                  const soldPct = tt.quantity > 0 ? Math.round((tt.sold / tt.quantity) * 100) : 0
                  return (
                    <tr key={tt.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-foreground">{tt.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatLkr(tt.price)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{tt.sold} / {tt.quantity}</span>
                          <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${soldPct}%` }}
                            />
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

      {/* Attendees */}
      <section className="rounded-xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" /> Attendees
            <span className="ml-2 text-xs text-muted-foreground">({attendees.length})</span>
          </h2>
        </div>
        {attendees.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No bookings yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Booking</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Attendee</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Booked</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {a.booking_reference}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {a.attendee_info?.name ?? "Anonymous"}
                      </div>
                      {a.attendee_info?.email && (
                        <div className="text-xs text-muted-foreground">{a.attendee_info.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.ticket_type_id ? ttMap[a.ticket_type_id] ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">{a.number_of_tickets}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatLkr(a.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      {a.checked_in_at ? (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3" /> In
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
