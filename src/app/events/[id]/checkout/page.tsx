"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Loader,
  Lock,
  MapPin,
  Minus,
  Plus,
  Ticket,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
  ticket_types: TicketType[]
}

const formatLkr = (n: number) =>
  n === 0 ? "Free" : `LKR ${n.toLocaleString()}`

export default function CheckoutPage() {
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
    if (!selectedTt) {
      setSubmitError("Pick a ticket type first.")
      return
    }
    if (quantity < 1 || quantity > maxQty) {
      setSubmitError(`Quantity must be between 1 and ${maxQty}.`)
      return
    }
    if (!attendee.email.trim()) {
      setSubmitError("Email is required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event!.id,
          ticket_type_id: selectedTt.id,
          quantity,
          attendee_info: {
            name: attendee.name.trim() || undefined,
            email: attendee.email.trim() || undefined,
            phone: attendee.phone.trim() || undefined,
          },
        }),
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
          {/* Ticket type selection */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Ticket className="h-5 w-5 text-primary" />
              Choose a ticket
            </h2>

            {event.ticket_types.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets available.</p>
            ) : (
              <ul className="space-y-2">
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
          </section>

          {/* Quantity */}
          {selectedTt && (
            <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <h2 className="mb-3 text-lg font-semibold text-foreground">Quantity</h2>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus />
                </Button>
                <span className="min-w-10 text-center text-xl font-semibold text-foreground">
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  aria-label="Increase quantity"
                >
                  <Plus />
                </Button>
                <span className="ml-2 text-xs text-muted-foreground">
                  Max {maxQty} per order
                </span>
              </div>
            </section>
          )}

          {/* Attendee details */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Attendee details</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              We&rsquo;ll email your tickets here. Phone is used by the venue if anything changes
              on the day.
            </p>

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
              <FieldGroup id="att-email" label="Email" required>
                <Input
                  id="att-email"
                  type="email"
                  value={attendee.email}
                  onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
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

  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
          soldOut && "cursor-not-allowed opacity-60",
          !soldOut && selected
            ? "border-primary bg-primary/5"
            : "border-border bg-background/40 hover:border-primary/40",
        )}
      >
        <input
          type="radio"
          name="ticket-type"
          checked={selected}
          onChange={onSelect}
          disabled={soldOut}
          className="mt-0.5 accent-primary"
        />
        <div className="flex flex-1 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-foreground">{ticket.name}</div>
            {ticket.description && (
              <div className="mt-0.5 text-sm text-muted-foreground">{ticket.description}</div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">
              {soldOut ? (
                <span className="text-destructive">Sold out</span>
              ) : lowStock ? (
                <span className="text-amber-600 dark:text-amber-400">Only {remaining} left</span>
              ) : (
                <span>{remaining} available · max {ticket.per_order_limit}/order</span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-base font-bold text-primary">{formatLkr(ticket.price)}</div>
          </div>
        </div>
      </label>
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
