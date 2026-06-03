"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ImageIcon,
  Loader,
  MapPin,
  Pencil,
  Save,
  ShoppingBag,
  Wallet,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface EventLite {
  id: string
  title: string
  banner_url: string | null
  start_time: string | null
  venue_name: string | null
  postponed: boolean
  postponed_to: string | null
}

interface CommsBreakdown {
  sms_count: number
  sms_total: number
  email_count: number
  email_total: number
}

interface PerEventBalance {
  gross: number
  fee: number
  net: number
  refunded: number
  paid_out: number
  pending: number
  // Communications charges — only events with admin-enabled billing have a
  // non-zero charge here; everyone else gets zeros so the UI can always
  // render the line without conditionals.
  comms_charge?: number
  comms?: CommsBreakdown
}

interface ShopBalance {
  gross: number
  fee: number
  net: number
  refunded: number
  paid_out: number
  pending: number
}

interface Payout {
  id: string
  amount: number | string
  status: "requested" | "approved" | "paid" | "rejected"
  notes: string | null
  event_id: string | null
  requested_at: string
  processed_at: string | null
  slip_url?: string | null
}

interface EventPayoutEntry {
  event: EventLite
  balance: PerEventBalance
  payouts: Payout[]
  timing: "live" | "past_recent" | "past_archived"
}

interface ShopBlock {
  balance: ShopBalance
  payouts: Payout[]
}

interface BankDetails {
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  branch_name: string | null
  bank_code: string | null
  branch_code: string | null
}

const PAYOUT_STATUS_META: Record<
  Payout["status"],
  { label: string; variant: "default" | "warning" | "success" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
  requested: { label: "Requested", variant: "outline", icon: Clock },
  approved:  { label: "Approved",  variant: "default", icon: CheckCircle },
  paid:      { label: "Paid",      variant: "success", icon: Banknote },
  rejected:  { label: "Rejected",  variant: "destructive", icon: XCircle },
}

const formatLkr = (n: number | string) => {
  const v = typeof n === "string" ? Number(n) : n
  return `LKR ${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatEventDate = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

export default function OrganizerPayoutsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [entries, setEntries] = React.useState<EventPayoutEntry[]>([])
  const [shop, setShop] = React.useState<ShopBlock | null>(null)
  const [platformFeePct, setPlatformFeePct] = React.useState(0.04)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  // Bank details — loaded from /api/organizers/me, edited inline.
  const [bank, setBank] = React.useState<BankDetails | null>(null)
  const [bankForm, setBankForm] = React.useState<BankDetails>({
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    branch_name: "",
    bank_code: "",
    branch_code: "",
  })
  const [bankEditing, setBankEditing] = React.useState(false)
  const [bankSaving, setBankSaving] = React.useState(false)
  const [bankError, setBankError] = React.useState("")

  React.useEffect(() => {
    if (authLoading) return
    if (!user) router.push("/auth/login?redirect=/organizer/payouts")
  }, [authLoading, user, router])

  const refetch = React.useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      // cache: 'no-store' forces a fresh hit. Without it the browser was
      // serving a stale cached body after admin actions even though the
      // focus-refetch fired — same URL, same Vary, same response.
      const [byEventRes, meRes] = await Promise.all([
        fetch(`${API_URL}/api/organizer/payouts/by-event`, { credentials: "include", cache: "no-store" }).then((r) => r.json()),
        fetch(`${API_URL}/api/organizers/me`, { credentials: "include", cache: "no-store" }).then((r) => r.json()),
      ])

      if (!byEventRes?.success) {
        setError(byEventRes?.message || "Failed to load payouts.")
        return
      }
      setEntries(byEventRes.data.events ?? [])
      setShop(byEventRes.data.shop ?? null)
      setPlatformFeePct(byEventRes.data.platform_fee_pct ?? 0.04)

      const p = meRes?.data?.profile
      if (p) {
        const initial: BankDetails = {
          bank_name: p.bank_name ?? "",
          bank_account_number: p.bank_account_number ?? "",
          bank_account_name: p.bank_account_name ?? "",
          branch_name: p.branch_name ?? "",
          bank_code: p.bank_code ?? "",
          branch_code: p.branch_code ?? "",
        }
        setBank(initial)
        setBankForm(initial)
        if (!initial.bank_name && !initial.bank_account_number) {
          setBankEditing(true)
        }
      }
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (user) refetch()
  }, [user, refetch])

  // Refetch when the tab regains focus or becomes visible — admin actions
  // happen in a separate session, so the organizer's open tab won't see
  // updates without this. Cheaper than a polling interval and keeps the
  // dashboard fresh whenever the organizer switches back from the bank /
  // email / wherever they verified the payout landed.
  React.useEffect(() => {
    if (!user) return
    const onFocus = () => refetch()
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [user, refetch])

  const handleSaveBank = async () => {
    setBankError("")
    if (
      !bankForm.bank_name?.trim() ||
      !bankForm.bank_account_number?.trim() ||
      !bankForm.bank_account_name?.trim() ||
      !bankForm.branch_name?.trim()
    ) {
      setBankError("Bank, branch, account holder name and account number are required.")
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
        branch_name: data.data.profile.branch_name ?? "",
        bank_code: data.data.profile.bank_code ?? "",
        branch_code: data.data.profile.branch_code ?? "",
      }
      setBank(saved)
      setBankForm(saved)
      setBankEditing(false)
    } catch {
      setBankError("Network error.")
    } finally {
      setBankSaving(false)
    }
  }

  const hasBank = !!bank?.bank_account_number
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
        <Button className="mt-4" onClick={refetch} size="sm">Try again</Button>
      </div>
    )
  }

  const totalEventPending = entries.reduce((sum, e) => sum + e.balance.pending, 0)
  const shopPending = shop?.balance.pending ?? 0
  // Hide the entire shop card when the organizer has no shop activity at all
  // (zero gross, zero refunds, zero historical payouts) — same logic as the
  // dashboard's shop-orders section.
  const showShopCard = !!shop && (
    shop.balance.gross > 0 ||
    shop.balance.refunded > 0 ||
    shop.balance.paid_out > 0 ||
    shop.payouts.length > 0
  )

  return (
    <div className="space-y-6">
      <Link
        href="/organizer"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each live event has its own card. MyScope retains a{" "}
          <span className="font-semibold text-foreground">{(platformFeePct * 100).toFixed(1)}%</span>{" "}
          platform fee. Events past 3 days are archived from this view.
        </p>
      </div>

      {/* Top summary — pending across events + shop. Each source has its
          own line so the totals don't get mixed. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryTile
          icon={Wallet}
          label="Pending across events"
          value={formatLkr(totalEventPending)}
          hint={
            entries.length === 0
              ? "No active events"
              : `${entries.length} ${entries.length === 1 ? "event" : "events"} eligible`
          }
          highlight={totalEventPending > 0}
        />
        {showShopCard && (
          <SummaryTile
            icon={ShoppingBag}
            label="Pending from shop"
            value={formatLkr(shopPending)}
            hint={shop ? `Net ${formatLkr(shop.balance.net)} · Paid out ${formatLkr(shop.balance.paid_out)}` : ""}
            highlight={shopPending > 0}
          />
        )}
      </section>

      {/* Bank details */}
      <section className="rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Bank details</h2>
            <p className="text-xs text-muted-foreground">Where MyScope sends your payouts.</p>
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
          {!bankEditing && bank && (bank.bank_name || bank.bank_account_number) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <BankRow label="Bank" value={bank.bank_name || "—"} />
              <BankRow label="Branch" value={bank.branch_name || "—"} />
              <BankRow label="Account holder" value={bank.bank_account_name || "—"} />
              <BankRow label="Account number" value={maskedAccount(bank.bank_account_number)} mono />
              {bank.bank_code && <BankRow label="Bank code" value={bank.bank_code} mono />}
              {bank.branch_code && <BankRow label="Branch code" value={bank.branch_code} mono />}
            </div>
          )}

          {bankEditing && (
            <div className="space-y-4">
              {bankError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{bankError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BankField id="bank-name" label="Bank" placeholder="Bank of Ceylon" value={bankForm.bank_name ?? ""} onChange={(v) => setBankForm((f) => ({ ...f, bank_name: v }))} />
                <BankField id="bank-branch" label="Branch" placeholder="Colombo Fort" value={bankForm.branch_name ?? ""} onChange={(v) => setBankForm((f) => ({ ...f, branch_name: v }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BankField id="bank-acct-name" label="Account holder name" placeholder="Acme Events Pvt Ltd" value={bankForm.bank_account_name ?? ""} onChange={(v) => setBankForm((f) => ({ ...f, bank_account_name: v }))} />
                <BankField id="bank-acct-num" label="Account number" placeholder="1234567890" value={bankForm.bank_account_number ?? ""} onChange={(v) => setBankForm((f) => ({ ...f, bank_account_number: v }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BankField id="bank-code" label="Bank code" placeholder="7056" optional value={bankForm.bank_code ?? ""} onChange={(v) => setBankForm((f) => ({ ...f, bank_code: v }))} />
                <BankField id="branch-code" label="Branch code" placeholder="001" optional value={bankForm.branch_code ?? ""} onChange={(v) => setBankForm((f) => ({ ...f, branch_code: v }))} />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                {bank && (bank.bank_name || bank.bank_account_number) && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setBankForm(bank); setBankEditing(false); setBankError("") }}>
                    Cancel
                  </Button>
                )}
                <Button type="button" size="sm" onClick={handleSaveBank} disabled={bankSaving}>
                  {bankSaving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {bankSaving ? "Saving…" : "Save bank details"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Per-event payout cards — surfaced first because events are the
          primary revenue source for most organizers and they want to see
          live-event balances before scrolling to shop. */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Event payouts</h2>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold text-foreground">No active events</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Approved events appear here once they're live or until 3 days after they end. Get an event approved to start tracking payouts.
            </p>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href="/organizer/events">Go to events</Link>
            </Button>
          </div>
        ) : (
          entries.map((entry) => (
            <EventPayoutCard
              key={entry.event.id}
              entry={entry}
              hasBank={hasBank}
              onChange={refetch}
            />
          ))
        )}
      </section>

      {/* Shop payout card — separate from events so the organizer can request
          shop revenue independently. Hidden entirely when there's no shop
          activity at all. Sits below events because it's a secondary revenue
          stream for most organizers. */}
      {showShopCard && shop && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Shop payout</h2>
          <ShopPayoutCard shop={shop} hasBank={hasBank} onChange={refetch} />
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EventPayoutCard — one per qualifying event. Shows the event header,
// per-event balance, and an inline payout request form. Payout history
// collapses by default to keep the page scannable.
// ---------------------------------------------------------------------------
function EventPayoutCard({
  entry,
  hasBank,
  onChange,
}: {
  entry: EventPayoutEntry
  hasBank: boolean
  onChange: () => void
}) {
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [amount, setAmount] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")

  const { event, balance, payouts, timing } = entry
  const hasOpenRequest = payouts.some((p) => p.status === "requested")
  const canRequest = balance.pending > 0 && hasBank && !hasOpenRequest

  const cover = event.banner_url
  const dateLabel = event.postponed && !event.postponed_to
    ? "New date to be announced"
    : formatEventDate(event.start_time) || "Date TBA"

  const submitRequest = async () => {
    setError("")
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.")
      return
    }
    if (amt > balance.pending) {
      setError(`Amount exceeds available balance (${formatLkr(balance.pending)}).`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/payouts/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, event_id: event.id, notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.message || "Failed to submit request.")
        return
      }
      setRequestOpen(false)
      setAmount("")
      setNotes("")
      onChange()
    } catch {
      setError("Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  // Fetch the slip as a blob and save it (mirrors event-side download).
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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {/* Event header */}
      <div className="flex flex-wrap items-start gap-4 p-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-full w-full p-4 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/organizer/events/${event.id}/analytics`}
              className="truncate text-base font-semibold text-foreground hover:text-primary"
            >
              {event.title}
            </Link>
            {timing === "live" ? (
              <Badge variant="success">Live</Badge>
            ) : timing === "past_recent" ? (
              <Badge variant="warning">Recently ended</Badge>
            ) : (
              <Badge variant="outline">Awaiting payout</Badge>
            )}
            {event.postponed && (
              <Badge variant="outline">Postponed</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {dateLabel}
            </span>
            {event.venue_name && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {event.venue_name}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending</div>
          <div className="mt-0.5 text-xl font-bold text-foreground">{formatLkr(balance.pending)}</div>
        </div>
      </div>

      {/* Balance breakdown — Comms only renders when the admin has enabled
          billing for this event (otherwise comms_charge is 0 and we hide the
          line to keep the grid uncluttered). */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border bg-muted/20 p-4 sm:grid-cols-4">
        <BalanceLine label="Gross" value={formatLkr(balance.gross)} />
        <BalanceLine label="Platform fee" value={`-${formatLkr(balance.fee)}`} />
        <BalanceLine label="Refunds" value={`-${formatLkr(balance.refunded)}`} />
        {(balance.comms_charge || 0) > 0 ? (
          <BalanceLine label="Comms" value={`-${formatLkr(balance.comms_charge || 0)}`} />
        ) : null}
        <BalanceLine label="Net" value={formatLkr(balance.net)} />
        <BalanceLine label="Paid out" value={formatLkr(balance.paid_out)} />
        <BalanceLine label="Pending" value={formatLkr(balance.pending)} highlight />
      </div>

      {/* Communications charges detail — SMS + email split so the organizer
          knows exactly what's being billed. Only renders for events the admin
          has enabled billing on (and that have at least one billable send). */}
      {(balance.comms_charge || 0) > 0 && balance.comms ? (
        <div className="border-t border-border bg-muted/10 px-4 py-3 text-xs">
          <div className="font-medium text-foreground">Communications billing</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span>
              SMS <span className="font-mono text-foreground">{balance.comms.sms_count}</span> · {formatLkr(balance.comms.sms_total)}
            </span>
            <span className="opacity-30">·</span>
            <span>
              Email <span className="font-mono text-foreground">{balance.comms.email_count}</span> · {formatLkr(balance.comms.email_total)}
            </span>
            <span className="opacity-30">·</span>
            <span>
              Total <span className="font-mono text-foreground">{formatLkr(balance.comms_charge || 0)}</span>
            </span>
          </div>
        </div>
      ) : null}

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
        <div className="flex items-center gap-3 text-xs">
          {canRequest ? (
            <span className="text-muted-foreground">Ready to request a payout</span>
          ) : hasOpenRequest ? (
            <span className="font-medium text-amber-600 dark:text-amber-400">Request pending review</span>
          ) : !hasBank ? (
            <span className="text-muted-foreground">Add bank details above to request</span>
          ) : balance.pending <= 0 ? (
            <span className="text-muted-foreground">No balance to request</span>
          ) : null}

          {payouts.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {historyOpen ? "Hide history" : `History (${payouts.length})`}
            </button>
          )}
        </div>

        {canRequest && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setRequestOpen((o) => !o)
              setError("")
              setAmount(String(balance.pending))
            }}
          >
            <Banknote className="h-3.5 w-3.5" />
            {requestOpen ? "Cancel" : "Request payout"}
          </Button>
        )}
      </div>

      {/* Inline request form */}
      {requestOpen && canRequest && (
        <div className="space-y-3 border-t border-border bg-muted/20 p-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`req-amount-${event.id}`} className="mb-1.5 block text-sm font-medium text-foreground">
                Amount (LKR)
              </label>
              <input
                id={`req-amount-${event.id}`}
                type="number"
                min={1}
                max={balance.pending}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Available: {formatLkr(balance.pending)}
              </p>
            </div>
            <div>
              <label htmlFor={`req-notes-${event.id}`} className="mb-1.5 block text-sm font-medium text-foreground">
                Note (optional)
              </label>
              <input
                id={`req-notes-${event.id}`}
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything we should know?"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submitRequest} disabled={submitting}>
              {submitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </div>
      )}

      {/* Payout history (collapsed by default) */}
      {historyOpen && payouts.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {payouts.map((p) => {
            const meta = PAYOUT_STATUS_META[p.status]
            const Icon = meta.icon
            return (
              <li key={p.id} className="flex items-start justify-between gap-3 p-4 sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge variant={meta.variant}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Requested{" "}
                    {new Date(p.requested_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {p.processed_at && (
                      <>
                        {" · "}
                        Processed{" "}
                        {new Date(p.processed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </>
                    )}
                  </div>
                  {p.notes && <div className="mt-1 text-xs italic text-muted-foreground">{p.notes}</div>}
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
                  <div className="text-sm font-semibold text-foreground">{formatLkr(p.amount)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ShopPayoutCard — same shape as EventPayoutCard but scoped to the organizer's
// shop revenue (no event_id on the payout). Sends `event_id: null` on the
// request so the backend stores it as a shop payout.
// ---------------------------------------------------------------------------
function ShopPayoutCard({
  shop, hasBank, onChange,
}: { shop: ShopBlock; hasBank: boolean; onChange: () => void }) {
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [amount, setAmount] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")

  const { balance, payouts } = shop
  const hasOpenRequest = payouts.some((p) => p.status === "requested")
  const canRequest = balance.pending > 0 && hasBank && !hasOpenRequest

  const submitRequest = async () => {
    setError("")
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.")
      return
    }
    if (amt > balance.pending) {
      setError(`Amount exceeds available balance (${formatLkr(balance.pending)}).`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/organizer/payouts/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // event_id omitted → backend treats as a shop payout (event_id IS NULL).
        body: JSON.stringify({ amount: amt, notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.message || "Failed to submit request.")
        return
      }
      setRequestOpen(false)
      setAmount("")
      setNotes("")
      onChange()
    } catch {
      setError("Network error.")
    } finally {
      setSubmitting(false)
    }
  }

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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-primary/10 text-primary">
          <ShoppingBag className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">Shop revenue</h3>
            <Badge variant="default">Storefront-wide</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            All confirmed shop orders across your storefront. Request a payout against the net.
          </p>
        </div>

        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending</div>
          <div className="mt-0.5 text-xl font-bold text-foreground">{formatLkr(balance.pending)}</div>
        </div>
      </div>

      {/* Balance breakdown */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border bg-muted/20 p-4 sm:grid-cols-4">
        <BalanceLine label="Gross" value={formatLkr(balance.gross)} />
        <BalanceLine label="Platform fee" value={`-${formatLkr(balance.fee)}`} />
        <BalanceLine label="Refunds" value={`-${formatLkr(balance.refunded)}`} />
        <BalanceLine label="Net" value={formatLkr(balance.net)} />
        <BalanceLine label="Paid out" value={formatLkr(balance.paid_out)} />
        <BalanceLine label="Pending" value={formatLkr(balance.pending)} highlight />
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
        <div className="flex items-center gap-3 text-xs">
          {canRequest ? (
            <span className="text-muted-foreground">Ready to request a payout</span>
          ) : hasOpenRequest ? (
            <span className="font-medium text-amber-600 dark:text-amber-400">Request pending review</span>
          ) : !hasBank ? (
            <span className="text-muted-foreground">Add bank details above to request</span>
          ) : balance.pending <= 0 ? (
            <span className="text-muted-foreground">No balance to request</span>
          ) : null}

          {payouts.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {historyOpen ? "Hide history" : `History (${payouts.length})`}
            </button>
          )}
        </div>

        {canRequest && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setRequestOpen((o) => !o)
              setError("")
              setAmount(String(balance.pending))
            }}
          >
            <Banknote className="h-3.5 w-3.5" />
            {requestOpen ? "Cancel" : "Request payout"}
          </Button>
        )}
      </div>

      {/* Inline request form */}
      {requestOpen && canRequest && (
        <div className="space-y-3 border-t border-border bg-muted/20 p-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="req-amount-shop" className="mb-1.5 block text-sm font-medium text-foreground">
                Amount (LKR)
              </label>
              <input
                id="req-amount-shop"
                type="number"
                min={1}
                max={balance.pending}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Available: {formatLkr(balance.pending)}
              </p>
            </div>
            <div>
              <label htmlFor="req-notes-shop" className="mb-1.5 block text-sm font-medium text-foreground">
                Note (optional)
              </label>
              <input
                id="req-notes-shop"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything we should know?"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submitRequest} disabled={submitting}>
              {submitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </div>
      )}

      {/* Payout history (collapsed by default) */}
      {historyOpen && payouts.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {payouts.map((p) => {
            const meta = PAYOUT_STATUS_META[p.status]
            const Icon = meta.icon
            return (
              <li key={p.id} className="flex items-start justify-between gap-3 p-4 sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge variant={meta.variant}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Requested{" "}
                    {new Date(p.requested_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {p.processed_at && (
                      <>
                        {" · "}
                        Processed{" "}
                        {new Date(p.processed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </>
                    )}
                  </div>
                  {p.notes && <div className="mt-1 text-xs italic text-muted-foreground">{p.notes}</div>}
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
                  <div className="text-sm font-semibold text-foreground">{formatLkr(p.amount)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SummaryTile({
  icon: Icon, label, value, hint, highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 shadow-xs",
        highlight ? "border-primary/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-xl sm:text-2xl font-bold text-foreground">{value}</div>
        </div>
        <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function BalanceLine({
  label, value, highlight = false,
}: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold", highlight ? "text-primary" : "text-foreground")}>
        {value}
      </div>
    </div>
  )
}

function BankRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold text-foreground", mono && "font-mono")}>{value}</div>
    </div>
  )
}

function BankField({
  id, label, value, placeholder, onChange, optional = false,
}: {
  id: string
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  optional?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {optional ? (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span>
        ) : (
          <span className="ml-0.5 text-destructive">*</span>
        )}
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

