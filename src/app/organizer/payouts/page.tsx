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
  Download,
  Loader,
  Pencil,
  Save,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

interface BankDetails {
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
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
  slip_url?: string | null
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

  // Bank details — loaded from /api/organizers/me, edited inline.
  const [bank, setBank] = React.useState<BankDetails | null>(null)
  const [bankForm, setBankForm] = React.useState<BankDetails>({
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  })
  const [bankEditing, setBankEditing] = React.useState(false)
  const [bankSaving, setBankSaving] = React.useState(false)
  const [bankError, setBankError] = React.useState("")
  const [bankSavedAt, setBankSavedAt] = React.useState<number | null>(null)

  // Payout request form
  const [events, setEvents] = React.useState<{ id: string; title: string }[]>([])
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [requestAmount, setRequestAmount] = React.useState("")
  const [requestEvent, setRequestEvent] = React.useState("")
  const [requestNotes, setRequestNotes] = React.useState("")
  const [requesting, setRequesting] = React.useState(false)
  const [requestError, setRequestError] = React.useState("")

  React.useEffect(() => {
    if (authLoading) return
    if (!user) router.push("/auth/login?redirect=/organizer/payouts")
  }, [authLoading, user, router])

  React.useEffect(() => {
    if (!user) return
    Promise.all([
      fetch(`${API_URL}/api/organizer/payouts/balance`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API_URL}/api/organizer/payouts`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API_URL}/api/organizers/me`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API_URL}/api/organizer/events`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([balRes, payRes, meRes, evRes]) => {
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
        if (evRes?.success) {
          setEvents((evRes.data.events ?? []).map((e: { id: string; title: string }) => ({ id: e.id, title: e.title })))
        }

        // Seed bank state from the organizer profile. Auto-open editor when
        // nothing is on file so the empty state has a clear CTA.
        const p = meRes?.data?.profile
        if (p) {
          const initial: BankDetails = {
            bank_name: p.bank_name ?? "",
            bank_account_number: p.bank_account_number ?? "",
            bank_account_name: p.bank_account_name ?? "",
          }
          setBank(initial)
          setBankForm(initial)
          if (!initial.bank_name && !initial.bank_account_number) {
            setBankEditing(true)
          }
        }
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false))
  }, [user])

  const handleSaveBank = async () => {
    setBankError("")
    if (!bankForm.bank_name?.trim() || !bankForm.bank_account_number?.trim() || !bankForm.bank_account_name?.trim()) {
      setBankError("All three fields are required.")
      return
    }
    setBankSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/organizers/me/bank`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      })
      const data = await res.json()
      if (!data?.success) {
        setBankError(data?.message || "Failed to save.")
        return
      }
      const saved: BankDetails = {
        bank_name: data.data.profile.bank_name ?? "",
        bank_account_number: data.data.profile.bank_account_number ?? "",
        bank_account_name: data.data.profile.bank_account_name ?? "",
      }
      setBank(saved)
      setBankForm(saved)
      setBankEditing(false)
      setBankSavedAt(Date.now())
    } catch {
      setBankError("Network error.")
    } finally {
      setBankSaving(false)
    }
  }

  const hasBank = !!bank?.bank_account_number
  const hasOpenRequest = payouts.some((p) => p.status === "requested")
  const canRequest = !!balance && balance.pending > 0 && hasBank && !hasOpenRequest

  const handleRequest = async () => {
    setRequestError("")
    if (!requestEvent) {
      setRequestError("Select the event this payout is for.")
      return
    }
    const amt = Number(requestAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setRequestError("Enter a valid amount.")
      return
    }
    if (balance && amt > balance.pending) {
      setRequestError(`Amount exceeds your available balance (${formatLkr(balance.pending)}).`)
      return
    }
    setRequesting(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/payouts/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, event_id: requestEvent || undefined, notes: requestNotes.trim() || undefined }),
      })
      const data = await res.json()
      if (!data?.success) {
        setRequestError(data?.message || "Failed to submit request.")
        return
      }
      // Re-fetch so the new row includes the joined event (the create
      // response returns the raw row without it).
      const pr = await fetch(`${API_URL}/api/organizer/payouts`, { credentials: "include" }).then((r) => r.json())
      if (pr?.success) setPayouts(pr.data.payouts as Payout[])
      setRequestOpen(false)
      setRequestAmount("")
      setRequestEvent("")
      setRequestNotes("")
    } catch {
      setRequestError("Network error.")
    } finally {
      setRequesting(false)
    }
  }

  // Fetch the slip as a blob and save it, so the browser downloads instead of
  // navigating to the storage URL. Falls back to opening the URL on failure.
  const downloadSlip = async (url: string, ref: string) => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const ext = (url.split("?")[0].split(".").pop() || "png").toLowerCase()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objUrl
      a.download = `payment-slip-${ref}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)
    } catch {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  // Tiny helper: only show the last 4 digits of the account number once saved.
  const maskedAccount = (n: string | null) => {
    if (!n) return "—"
    const trimmed = n.replace(/\s+/g, "")
    if (trimmed.length <= 4) return trimmed
    return `•••• ${trimmed.slice(-4)}`
  }

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
            {balance ? (balance.platform_fee_pct * 100).toFixed(1) : "4.0"}%
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

      {/* Bank details — where MyScope sends payouts. Editable any time. */}
      <section className="rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Bank details</h2>
            <p className="text-xs text-muted-foreground">
              Where MyScope sends your weekly payouts.
            </p>
          </div>
          {bank && !bankEditing && (bank.bank_name || bank.bank_account_number) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBankEditing(true)
                setBankError("")
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>

        <div className="p-4">
          {/* Display mode — show saved values with the account number masked */}
          {!bankEditing && bank && (bank.bank_name || bank.bank_account_number) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <BankRow label="Bank" value={bank.bank_name || "—"} />
              <BankRow label="Account number" value={maskedAccount(bank.bank_account_number)} mono />
              <BankRow label="Account holder" value={bank.bank_account_name || "—"} />
            </div>
          )}

          {/* Edit mode — form for first-time setup or editing */}
          {bankEditing && (
            <div className="space-y-4">
              {bankError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{bankError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BankField
                  id="bank-name"
                  label="Bank"
                  placeholder="Bank of Ceylon"
                  value={bankForm.bank_name ?? ""}
                  onChange={(v) => setBankForm((f) => ({ ...f, bank_name: v }))}
                />
                <BankField
                  id="bank-acct-num"
                  label="Account number"
                  placeholder="1234567890"
                  value={bankForm.bank_account_number ?? ""}
                  onChange={(v) => setBankForm((f) => ({ ...f, bank_account_number: v }))}
                />
              </div>

              <BankField
                id="bank-acct-name"
                label="Account holder name"
                placeholder="Acme Events Pvt Ltd"
                value={bankForm.bank_account_name ?? ""}
                onChange={(v) => setBankForm((f) => ({ ...f, bank_account_name: v }))}
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                {bank && (bank.bank_name || bank.bank_account_number) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBankForm(bank)
                      setBankEditing(false)
                      setBankError("")
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveBank}
                  disabled={bankSaving}
                >
                  {bankSaving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {bankSaving ? "Saving…" : "Save bank details"}
                </Button>
              </div>
            </div>
          )}

          {bankSavedAt && !bankEditing && (
            <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
              Bank details saved.
            </p>
          )}
        </div>
      </section>

      {/* Payouts list */}
      <section className="rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Payout history</h2>
            <p className="text-xs text-muted-foreground">
              Request a payout of your available balance. Our team reviews and processes it.
            </p>
          </div>
          {canRequest ? (
            <Button type="button" size="sm" onClick={() => { setRequestOpen((o) => !o); setRequestError(""); setRequestAmount(balance ? String(balance.pending) : "") }}>
              <Banknote className="h-3.5 w-3.5" /> Request payout
            </Button>
          ) : hasOpenRequest ? (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Request pending review</span>
          ) : !hasBank ? (
            <span className="text-xs text-muted-foreground">Add bank details to request a payout</span>
          ) : (
            <span className="text-xs text-muted-foreground">No balance available to request</span>
          )}
        </div>

        {/* Request form */}
        {requestOpen && canRequest && (
          <div className="space-y-3 border-b border-border bg-muted/20 p-4">
            {requestError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}
            <div>
              <label htmlFor="req-event" className="mb-1.5 block text-sm font-medium text-foreground">
                Event
              </label>
              <select
                id="req-event"
                value={requestEvent}
                onChange={(e) => setRequestEvent(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select an event…</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="req-amount" className="mb-1.5 block text-sm font-medium text-foreground">
                  Amount (LKR)
                </label>
                <input
                  id="req-amount"
                  type="number"
                  min={1}
                  max={balance?.pending}
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">Available: {formatLkr(balance?.pending ?? 0)}</p>
              </div>
              <div>
                <label htmlFor="req-notes" className="mb-1.5 block text-sm font-medium text-foreground">
                  Note (optional)
                </label>
                <input
                  id="req-notes"
                  type="text"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Anything we should know?"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleRequest} disabled={requesting}>
                {requesting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                {requesting ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </div>
        )}
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
                <li key={p.id} className="flex items-start justify-between gap-3 p-4 sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                    {p.slip_url && (
                      <button
                        type="button"
                        onClick={() => downloadSlip(p.slip_url!, p.id.slice(0, 8))}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" /> Download payment slip
                      </button>
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
        "rounded-xl border bg-card p-4 sm:p-5 shadow-xs",
        highlight ? "border-primary/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</div>
          <div className="mt-1 truncate text-xl sm:text-2xl font-bold text-foreground">{value}</div>
        </div>
        <span className={cn("inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-md", iconStyles)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function BankRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-sm font-semibold text-foreground", mono && "font-mono")}>
        {value}
      </div>
    </div>
  )
}

function BankField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        <span className="ml-0.5 text-destructive">*</span>
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      />
    </div>
  )
}
