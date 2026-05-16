"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle,
  Clock,
  Loader,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Balance {
  gross: number
  fee: number
  net: number
  refunded: number
  paid_out: number
  pending: number
  platform_fee_pct: number
}

interface Payout {
  id: string
  amount: number | string
  status: "requested" | "approved" | "paid" | "rejected"
  notes: string | null
  event_id: string | null
  event?: { id: string; title: string } | null
  requested_at: string
  processed_at: string | null
}

const STATUS_META: Record<
  Payout["status"],
  { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
  requested: { label: "Requested", variant: "outline", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  paid: { label: "Paid", variant: "success", icon: Banknote },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
}

const formatLkr = (n: number | string) => {
  const v = typeof n === "string" ? Number(n) : n
  return `LKR ${(v || 0).toLocaleString()}`
}

export default function OrganizerPayoutsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [balance, setBalance] = React.useState<Balance | null>(null)
  const [payouts, setPayouts] = React.useState<Payout[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (authLoading) return
    if (!user) router.push("/auth/login?redirect=/organizer/payouts")
  }, [authLoading, user, router])

  React.useEffect(() => {
    if (!user) return
    Promise.all([
      fetch(`${API_URL}/api/organizer/payouts/balance`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API_URL}/api/organizer/payouts`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([balRes, payRes]) => {
        if (!balRes?.success) {
          setError(balRes?.message || "Failed to load balance.")
          return
        }
        if (!payRes?.success) {
          setError(payRes?.message || "Failed to load payouts.")
          return
        }
        setBalance(balRes.data.balance)
        setPayouts(payRes.data.payouts as Payout[])
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

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-base font-semibold text-foreground">Couldn&rsquo;t load payouts</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/organizer"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track event revenue and payouts. MyScope retains a{" "}
          <span className="font-semibold text-foreground">
            {balance ? (balance.platform_fee_pct * 100).toFixed(1) : "5.0"}%
          </span>{" "}
          platform fee.
        </p>
      </div>

      {/* Balance cards */}
      {balance && (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <BalanceCard
            icon={TrendingUp}
            label="Gross revenue"
            value={formatLkr(balance.gross)}
          />
          <BalanceCard
            icon={Wallet}
            label="Net (after fees)"
            value={formatLkr(balance.net)}
            hint={`Fee ${formatLkr(balance.fee)} · Refunds ${formatLkr(balance.refunded)}`}
          />
          <BalanceCard
            icon={Banknote}
            label="Paid out"
            value={formatLkr(balance.paid_out)}
            tone="success"
          />
          <BalanceCard
            icon={Clock}
            label="Pending"
            value={formatLkr(balance.pending)}
            tone="warning"
            highlight
          />
        </section>
      )}

      {/* Payouts list */}
      <section className="rounded-xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Payout history</h2>
          <p className="text-xs text-muted-foreground">
            Payouts are released weekly. Reach out to support if anything looks off.
          </p>
        </div>
        {payouts.length === 0 ? (
          <div className="p-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Banknote className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-foreground">No payouts yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Payouts appear here once we&rsquo;ve processed your first event balance.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {payouts.map((p) => {
              const meta = STATUS_META[p.status]
              const Icon = meta.icon
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={meta.variant}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                      {p.event && (
                        <Link
                          href={`/organizer/events/${p.event.id}/analytics`}
                          className="line-clamp-1 text-sm font-medium text-foreground hover:text-primary"
                        >
                          {p.event.title}
                        </Link>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Requested{" "}
                      {new Date(p.requested_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {p.processed_at && (
                        <>
                          {" · "}
                          Processed{" "}
                          {new Date(p.processed_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </>
                      )}
                    </div>
                    {p.notes && (
                      <div className="mt-1 text-xs italic text-muted-foreground">{p.notes}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {formatLkr(p.amount)}
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

function BalanceCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  tone?: "default" | "success" | "warning"
  highlight?: boolean
}) {
  const iconStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }[tone]

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-xs",
        highlight ? "border-primary/40" : "border-border",
      )}
    >
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
