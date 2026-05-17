"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Loader,
  Lock,
  MapPin,
  Minus,
  Plus,
  Ticket,
  User as UserIcon,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SeatMapPicker, type SelectedSeat } from "@/components/events/seat-map-picker"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface TicketType {
  id: string
  name: string
  description: string | null
  price: number
  quantity_total: number
  quantity_sold: number
  per_order_limit: number
}

type SeatingMode = "none" | "free" | "zoned" | "reserved"

interface EventDetail {
  id: string
  title: string
  description: string | null
  category: string | null
  venue_name: string | null
  venue_address: string | null
  start_time: string | null
  date: string | null
  banner_url: string | null
  approval_status: string
  seating_mode?: SeatingMode | null
  ticket_types: TicketType[]
}

const formatLkr = (n: number) =>
  n === 0 ? "Free" : `LKR ${n.toLocaleString()}`

// Suspense wrapper — useSearchParams() bails Next 16 prerender otherwise.
export default function CheckoutPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
      <CheckoutPageInner />
    </React.Suspense>
  )
}

function CheckoutPageInner() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const eventId = params?.id
  const { user, loading: authLoading } = useAuth()

  // Pre-selection from the event detail page (?tt=…&qty=…)
  const ttFromUrl = searchParams?.get("tt") ?? null
  const qtyFromUrl = Number(searchParams?.get("qty") ?? "") || null

  const [event, setEvent] = React.useState<EventDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")

  const [selectedTtId, setSelectedTtId] = React.useState<string | null>(ttFromUrl)
  const [quantity, setQuantity] = React.useState(qtyFromUrl && qtyFromUrl > 0 ? qtyFromUrl : 1)
  const [attendee, setAttendee] = React.useState({ name: "", email: "", phone: "" })

  // Reserved-mode state — seat picker manages its own list, parent just holds the result.
  const [selectedSeats, setSelectedSeats] = React.useState<SelectedSeat[]>([])
  const [seatTotal, setSeatTotal] = React.useState(0)
  const isReserved = event?.seating_mode === "reserved"

  // Auth guard
  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=/events/${eventId}/checkout`)
    }
  }, [authLoading, user, eventId, router])

  // Pre-fill attendee from logged-in user (Profile → Dashboard updates these)
  React.useEffect(() => {
    if (user) {
      setAttendee({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      })
    }
  }, [user])

  // Load event + ticket types
  React.useEffect(() => {
    if (!eventId) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_URL}/api/events/${eventId}`, {
          credentials: "include",
        })
        const data = await res.json()
        if (cancelled) return
        if (!data?.success) {
          setLoadError(data?.message || "Event not found.")
          return
        }
        const e = data.data.event as EventDetail
        setEvent(e)
        // If the URL pre-selected a tier and it's still available, keep it.
        // Otherwise auto-pick the first available tier.
        const preselected = ttFromUrl
          ? e.ticket_types?.find((t) => t.id === ttFromUrl && t.quantity_total - t.quantity_sold > 0)
          : null
        if (preselected) {
          // Already set from URL — just clamp qty to limits
          const available = preselected.quantity_total - preselected.quantity_sold
          const max = Math.max(1, Math.min(preselected.per_order_limit, available))
          setQuantity((q) => Math.max(1, Math.min(q, max)))
        } else {
          const firstAvail = e.ticket_types?.find(
            (t) => t.quantity_total - t.quantity_sold > 0,
          )
          if (firstAvail) setSelectedTtId(firstAvail.id)
        }
      } catch {
        if (!cancelled) setLoadError("Network error loading event.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId, ttFromUrl])

  const selectedTt = event?.ticket_types?.find((t) => t.id === selectedTtId) ?? null
  const available = selectedTt ? selectedTt.quantity_total - selectedTt.quantity_sold : 0
  const maxQty = selectedTt ? Math.min(selectedTt.per_order_limit, available) : 1
  const total = selectedTt ? selectedTt.price * quantity : 0

  // Clamp quantity when switching ticket type
  React.useEffect(() => {
    if (selectedTt && quantity > maxQty) setQuantity(Math.max(1, maxQty))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTtId])

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")

    if (!attendee.email.trim()) {
      setSubmitError("Email is required.")
      return
    }

    let body: Record<string, unknown>

    if (isReserved) {
      if (selectedSeats.length === 0) {
        setSubmitError("Pick at least one seat.")
        return
      }
      body = {
        event_id: event!.id,
        seat_ids: selectedSeats.map((s) => s.id),
        attendee_info: {
          name: attendee.name.trim() || undefined,
          email: attendee.email.trim() || undefined,
          phone: attendee.phone.trim() || undefined,
        },
      }
    } else {
      if (!selectedTt) {
        setSubmitError("Pick a ticket type first.")
        return
      }
      if (quantity < 1 || quantity > maxQty) {
        setSubmitError(`Quantity must be between 1 and ${maxQty}.`)
        return
      }
      body = {
        event_id: event!.id,
        ticket_type_id: selectedTt.id,
        quantity,
        attendee_info: {
          name: attendee.name.trim() || undefined,
          email: attendee.email.trim() || undefined,
          phone: attendee.phone.trim() || undefined,
        },
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data?.success) {
        setSubmitError(data?.message || "Checkout failed.")
        return
      }
      router.push(`/bookings/event/${data.data.booking.id}`)
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <Loader className="mx-auto h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError || !event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-3 text-xl font-semibold">Event unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">{loadError || "Event not found."}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/events">
            <ArrowLeft /> Browse events
          </Link>
        </Button>
      </div>
    )
  }

  if (event.approval_status !== "approved") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">{event.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This event isn&rsquo;t open for booking right now.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/events">Browse other events</Link>
        </Button>
      </div>
    )
  }

  const whenIso = event.start_time || event.date
  const dateObj = whenIso ? new Date(whenIso) : null
  const venue = event.venue_name

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href={`/events/${eventId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to event
      </Link>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge>Checkout</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {event.title}
          </h1>
          {(dateObj || venue) && (
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {dateObj && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {dateObj.toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
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
          )}
        </div>
      </div>

      {/* Inline error */}
      {submitError && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleCheckout} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: ticket selection + attendee form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Reserved-seating: seat map. Other modes: ticket-type list. */}
          {isReserved ? (
            <section className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs">
              <header className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-foreground">Pick your seats</h2>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {selectedSeats.length} selected
                </span>
              </header>
              <SeatMapPicker
                eventId={event.id}
                maxPerOrder={8}
                onSelectionChange={(seats, total) => {
                  setSelectedSeats(seats)
                  setSeatTotal(total)
                }}
              />
            </section>
          ) : (
          /* Ticket type selection (with quantity in footer) */
          (() => {
            const isZoned = event.seating_mode === "zoned"
            const isFree = event.seating_mode === "free"
            const heading = isZoned ? "Choose a zone" : "Choose a ticket"
            const unitLabel = (n: number) =>
              isZoned ? (n === 1 ? "zone" : "zones") : (n === 1 ? "tier" : "tiers")
            const emptyText = isZoned ? "No zones available." : "No tickets available."

            return (
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{heading}</h2>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {event.ticket_types.length} {unitLabel(event.ticket_types.length)}
              </span>
            </header>

            {/* Open-seating notice — free mode means seats exist but aren't assigned */}
            {isFree && (
              <div className="border-b border-border bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
                Open seating — pick a seat on arrival, first come, first served.
              </div>
            )}

            {event.ticket_types.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              <ul className="divide-y divide-border">
                {event.ticket_types.map((tt) => (
                  <TicketTypeOption
                    key={tt.id}
                    ticket={tt}
                    selected={selectedTtId === tt.id}
                    onSelect={() => setSelectedTtId(tt.id)}
                  />
                ))}
              </ul>
            )}

            {/* Quantity + subtotal footer */}
            {selectedTt && (
              <div className="border-t border-border bg-muted/30 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Qty</span>
                    <div className="flex items-center rounded-lg border border-border bg-card">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        className="flex h-9 w-9 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-10 text-center text-base font-semibold tabular-nums text-foreground">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        disabled={quantity >= maxQty}
                        aria-label="Increase quantity"
                        className="flex h-9 w-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      max {maxQty}/order
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Subtotal
                    </div>
                    <div className="text-lg font-bold text-foreground">{formatLkr(total)}</div>
                  </div>
                </div>
              </div>
            )}
          </section>
            )
          })()
          )}

          {/* Attendee details */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <header className="flex items-center gap-2 border-b border-border px-5 py-4">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Attendee details</h2>
            </header>
            <div className="px-5 py-5">
            <p className="mb-4 text-xs text-muted-foreground">
              Phone is used by the venue if anything changes on the day.
            </p>

            {/* Locked email — tied to the Google account, not editable */}
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Tickets will be sent to
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {attendee.email || "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup id="att-name" label="Name">
                <Input
                  id="att-name"
                  type="text"
                  value={attendee.name}
                  onChange={(e) => setAttendee({ ...attendee, name: e.target.value })}
                  autoComplete="name"
                  placeholder="Akila Perera"
                />
              </FieldGroup>
              <FieldGroup id="att-phone" label="Phone" helper="Optional, helpful for venue updates">
                <Input
                  id="att-phone"
                  type="tel"
                  value={attendee.phone}
                  onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })}
                  autoComplete="tel"
                  placeholder="+94 77 123 4567"
                />
              </FieldGroup>
            </div>
            </div>
          </section>

          {/* Mobile: pay button shows here too */}
          <div className="lg:hidden">
            <Button type="submit" size="lg" className="w-full" disabled={submitting || !selectedTt}>
              <Lock />
              {submitting ? "Processing…" : total === 0 ? "Reserve" : `Pay ${formatLkr(total)}`}
            </Button>
          </div>
        </div>

        {/* Right: sticky order summary */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-base font-semibold text-foreground">Order summary</h2>

            {selectedTt ? (
              <>
                <SummaryRow
                  label={`${selectedTt.name} × ${quantity}`}
                  value={formatLkr(selectedTt.price * quantity)}
                />
                <div className="border-t border-border pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold text-foreground">{formatLkr(total)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a ticket type to see the total.</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="hidden w-full lg:inline-flex"
              disabled={submitting || !selectedTt}
            >
              <Lock />
              {submitting ? "Processing…" : total === 0 ? "Reserve" : `Pay ${formatLkr(total)}`}
            </Button>

            <p className="text-xs text-muted-foreground">
              By completing your purchase you agree to MyScope&rsquo;s{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </aside>
      </form>
    </div>
  )
}

function TicketTypeOption({
  ticket,
  selected,
  onSelect,
}: {
  ticket: TicketType
  selected: boolean
  onSelect: () => void
}) {
  const remaining = Math.max(0, ticket.quantity_total - ticket.quantity_sold)
  const soldOut = remaining <= 0
  const lowStock = !soldOut && remaining <= 10
  const price = Number(ticket.price)

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={soldOut}
        aria-pressed={selected ? "true" : "false"}
        className={cn(
          "group w-full px-5 py-4 text-left transition-colors",
          soldOut ? "cursor-not-allowed opacity-55" : "cursor-pointer",
          selected ? "bg-primary/5" : "hover:bg-muted/40",
        )}
      >
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              selected
                ? "border-primary bg-primary"
                : "border-border bg-transparent group-hover:border-muted-foreground/40",
            )}
          >
            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{ticket.name}</span>
              {soldOut && (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                  Sold out
                </span>
              )}
              {lowStock && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Only {remaining} left
                </span>
              )}
            </div>
            {ticket.description && (
              <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
            )}
            {!soldOut && !lowStock && (
              <p className="mt-1 text-xs text-muted-foreground">
                {remaining} available · max {ticket.per_order_limit}/order
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              LKR
            </div>
            <div className="text-xl font-bold leading-tight text-foreground">
              {price === 0
                ? "Free"
                : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </button>
    </li>
  )
}

function FieldGroup({
  id,
  label,
  required,
  helper,
  children,
}: {
  id?: string
  label: string
  required?: boolean
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="min-w-0 truncate pr-2 text-muted-foreground">{label}</span>
      <span className="shrink-0 font-medium text-foreground">{value}</span>
    </div>
  )
}
