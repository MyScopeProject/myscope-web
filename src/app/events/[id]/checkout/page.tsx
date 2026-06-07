"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
 AlertCircle,
 ArrowLeft,
 CalendarClock,
 Check,
 Loader,
 Lock,
 Minus,
 Plus,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CheckoutSteps } from "@/components/checkout/checkout-steps"
import {
  SeatMapPicker,
  ZoomControls,
  SEATMAP_MIN_ZOOM,
  SEATMAP_MAX_ZOOM,
  clampSeatmapZoom,
  type SelectedSeat,
} from "@/components/events/seat-map-picker"

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
 layout_image_url: string | null
 approval_status: string
 seating_mode?: SeatingMode | null
 postponed?: boolean
 postponed_to?: string | null
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

 // Two-step wizard: 0 = "Choose" (seat map / ticket picker + summary),
 // 1 = "Pay" (attendee details + gift recipients + payment). The 2nd step
 // of the global indicator is Details (which we collapse into Pay on this
 // page), so we map: step 0 → activeIndex 0, step 1 → activeIndex 1.
 const [step, setStep] = React.useState<0 | 1>(0)
 // Step-1 transition: validate that the user has actually picked seats /
 // a ticket type before showing the Pay screen, and reset any prior submit
 // error so the new screen renders clean.
 const advanceToPay = React.useCallback(() => {
  setSubmitError("")
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  setStep(1)
 }, [])

 const [selectedTtId, setSelectedTtId] = React.useState<string | null>(ttFromUrl)
 const [quantity, setQuantity] = React.useState(qtyFromUrl && qtyFromUrl > 0 ? qtyFromUrl : 1)
 const [attendee, setAttendee] = React.useState({ name: "", email: "", phone: "" })

 // Reserved-mode state — seat picker manages its own list, parent just holds the result.
 const [selectedSeats, setSelectedSeats] = React.useState<SelectedSeat[]>([])
 const [seatTotal, setSeatTotal] = React.useState(0)
 const isReserved = event?.seating_mode === "reserved"

 // Seat-map zoom — lifted here so we can render <ZoomControls/> in the
 // section header (next to the "seats selected" pill) rather than above
 // the seatmap. The picker becomes controlled when we pass `zoom` to it.
 const [seatZoom, setSeatZoom] = React.useState(1)
 const zoomIn    = () => setSeatZoom(z => clampSeatmapZoom(z * 1.2))
 const zoomOut   = () => setSeatZoom(z => clampSeatmapZoom(z / 1.2))
 const zoomReset = () => setSeatZoom(1)

 // Customer-visible platform fee %. Fetched once on mount; default to 0.02
 // (2%) so we don't render a zero fee on first paint when the public settings
 // endpoint hasn't responded yet. The backend is authoritative when the
 // booking is actually created — this state only drives the UI summary.
 const [convenienceFeePct, setConvenienceFeePct] = React.useState(0.02)
 React.useEffect(() => {
  let cancelled = false
  fetch(`${API_URL}/api/settings/fees`)
   .then((r) => r.json())
   .then((body) => {
    if (cancelled) return
    const pct = Number(body?.data?.convenience_fee_pct)
    if (Number.isFinite(pct) && pct >= 0) setConvenienceFeePct(pct)
   })
   .catch(() => {
    // soft-fail: keep the 0.02 default
   })
  return () => {
   cancelled = true
  }
 }, [])

 // Per-attendee gift recipients. Opt-in: buyer toggles "Send each ticket to a
 // different person" to reveal N name+email inputs. Stored as a sparse array
 // — empty slots default to the buyer at emission time.
 const [giftMode, setGiftMode] = React.useState(false)
 const [recipients, setRecipients] = React.useState<{ name: string; email: string }[]>([])
 const ticketCount = isReserved ? selectedSeats.length : quantity

 // Promo code state. The discount is server-validated against the current
 // subtotal — if the user changes quantity or tier after applying, we re-clear
 // and force them to re-apply so a fixed amount never silently exceeds the new total.
 const [promoInput, setPromoInput] = React.useState("")
 const [promoApplied, setPromoApplied] = React.useState<{
  code: string
  discount: number
 } | null>(null)
 const [promoChecking, setPromoChecking] = React.useState(false)
 const [promoError, setPromoError] = React.useState("")
 // Keep the recipients array sized to ticketCount whenever it changes.
 React.useEffect(() => {
  setRecipients((prev) => {
   if (prev.length === ticketCount) return prev
   const next = [...prev]
   while (next.length < ticketCount) next.push({ name: "", email: "" })
   next.length = ticketCount
   return next
  })
 }, [ticketCount])

 // Auth guard — only required for reserved-seating events. Other modes
 // (none/free/zoned) allow guest checkout: the buyer just supplies an email.
 React.useEffect(() => {
  if (authLoading) return
  if (!user && event?.seating_mode === "reserved") {
   router.push(`/auth/login?redirect=/events/${eventId}/checkout`)
  }
 }, [authLoading, user, eventId, router, event?.seating_mode])

 // Pre-fill attendee from logged-in user (Profile → Dashboard updates these).
 // Guests start with blank fields — they edit them directly.
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
 const subtotal = isReserved
  ? seatTotal
  : selectedTt
   ? selectedTt.price * quantity
   : 0
 const discount = promoApplied?.discount ?? 0
 const subtotalAfterDiscount = Math.max(0, subtotal - discount)
 // Convenience fee is added on top of the (post-discount) subtotal. The %
 // comes from /api/settings/fees so an admin rate change propagates without
 // a deploy. Default to 2% so the UI never renders a zero fee if the public
 // settings call hasn't returned yet — the backend is authoritative anyway.
 const convenienceFee = +(subtotalAfterDiscount * convenienceFeePct).toFixed(2)
 const total = subtotalAfterDiscount + convenienceFee

 // Any change to the subtotal invalidates a previously-applied code (the
 // backend will re-validate at checkout, but we should not show a stale
 // discount line while the user is editing). Clear when subtotal moves.
 React.useEffect(() => {
  if (promoApplied) {
   setPromoApplied(null)
   setPromoError("Subtotal changed — please re-apply your promo code.")
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [subtotal])

 // Clamp quantity when switching ticket type
 React.useEffect(() => {
  if (selectedTt && quantity > maxQty) setQuantity(Math.max(1, maxQty))
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [selectedTtId])

 const applyPromo = async () => {
  setPromoError("")
  const code = promoInput.trim()
  if (!code) {
   setPromoError("Enter a code first.")
   return
  }
  if (subtotal <= 0) {
   setPromoError("Pick a ticket first.")
   return
  }
  setPromoChecking(true)
  try {
   const res = await fetch(`${API_URL}/api/promo/validate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, event_id: event?.id, subtotal }),
   })
   const data = await res.json()
   if (!data?.success) {
    setPromoError(data?.message || "Invalid code.")
    return
   }
   setPromoApplied({ code: data.data.code, discount: Number(data.data.discount) })
  } catch {
   setPromoError("Network error checking code.")
  } finally {
   setPromoChecking(false)
  }
 }

 const handleCheckout = async (e: React.FormEvent) => {
  e.preventDefault()
  setSubmitError("")

  if (!attendee.email.trim()) {
   setSubmitError("Email is required.")
   return
  }
  if (!attendee.phone.trim()) {
   setSubmitError("Phone number is required for SMS updates.")
   return
  }

  let body: Record<string, unknown>

  // Only include the recipients array if the buyer actually filled out at
  // least one email — empty arrays would just be noise to the backend.
  const giftPayload = giftMode
   ? recipients
     .slice(0, ticketCount)
     .map((r) => ({ name: r.name.trim() || undefined, email: r.email.trim() || undefined }))
     .filter((r) => r.email || r.name)
   : []

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
    ...(giftPayload.length ? { recipients: giftPayload } : {}),
    ...(promoApplied ? { promo_code: promoApplied.code } : {}),
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
    ...(giftPayload.length ? { recipients: giftPayload } : {}),
    ...(promoApplied ? { promo_code: promoApplied.code } : {}),
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
   // Guest bookings come with an opaque access token instead of a session —
   // pass it via ?t= so the confirmation page can re-authenticate the buyer.
   const guestToken = data.data.guest_access_token as string | undefined
   const dest = `/bookings/event/${data.data.booking.id}${guestToken ? `?t=${encodeURIComponent(guestToken)}` : ""}`
   router.push(dest)
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
     <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
      {event.title}
     </h1>
    </div>
   </div>

   {/* Postpone tag — buy-ticket section. Buyers booking a postponed event see
     the rescheduled status (or "date to be announced") before paying. */}
   {event.postponed && (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
     <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
     <span>
      {event.postponed_to
       ? `This event has been postponed to ${new Date(event.postponed_to).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Your tickets remain valid for the new date.`
       : "This event has been postponed — a new date will be announced soon. Your tickets remain valid."}
     </span>
    </div>
   )}

   {/* Inline error */}
   {submitError && (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
     <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
     <span>{submitError}</span>
    </div>
   )}

   {/* Progress strip — Step 1 (Choose) and Step 2 (Details/Pay merged) live
     on this page as a two-step wizard. Step 3 (Pay) is the payment-gateway
     screen at /bookings/event/[id]. */}
   <CheckoutSteps activeIndex={step === 0 ? 0 : 1} />

   <form onSubmit={handleCheckout} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
    {/* Left: step 0 = ticket / seat selection · step 1 = attendee form */}
    <div className="space-y-6 lg:col-span-2">
     {/* ---- Step 0: Choose ----
       Rendered always (just hidden on step 1) so the SeatMapPicker stays
       mounted across the wizard. Unmounting it would fire the picker's
       cleanup effect and `POST /seats/release` every held seat — i.e. the
       user's holds vanish the moment they click "Continue to payment". */}
     <div className={step === 0 ? undefined : "hidden"}>
     <div className="space-y-6">
     {/* Reserved-seating: seat map. Other modes: ticket-type list. */}
     {isReserved ? (
      <section className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs dark:bg-card/40">
       <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
         <h2 className="text-base font-semibold text-foreground sm:text-lg">Pick your seats</h2>
         <p className="mt-0.5 text-xs text-muted-foreground">
          Tap a seat to add it. Pinch / Ctrl+scroll to zoom.
         </p>
        </div>
        <div className="flex items-center gap-2">
         <ZoomControls
          zoom={seatZoom}
          min={SEATMAP_MIN_ZOOM}
          max={SEATMAP_MAX_ZOOM}
          onIn={zoomIn} onOut={zoomOut} onReset={zoomReset}
         />
         <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium dark:bg-card/40">
          <span className="font-semibold text-foreground">{selectedSeats.length}</span>
          <span className="text-muted-foreground">
           {selectedSeats.length === 1 ? "seat" : "seats"} selected
          </span>
         </span>
        </div>
       </header>
       <SeatMapPicker
        eventId={event.id}
        maxPerOrder={8}
        zoom={seatZoom}
        onZoomChange={setSeatZoom}
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
      const emptyText = isZoned ? "No zones available." : "No tickets available."

      return (
     <section className="overflow-hidden rounded-2xl border border-border bg-card/30 shadow-xs backdrop-blur-md">
      <header className="border-b border-border px-5 py-4">
       <h2 className="text-base font-semibold text-foreground">{heading}</h2>
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
          <div className="flex items-center rounded-lg rounded-2xl border border-border bg-card">
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

     {/* Seating / zone layout — a reference map the organizer uploaded.
       Opens full-size in a new tab for zooming. Placed below the ticket
       picker so users see the picker first, then can consult the map
       before confirming their choice. */}
     {event.layout_image_url && (
      <section className="overflow-hidden rounded-2xl border border-border bg-card/30 shadow-xs backdrop-blur-md">
       <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Seating layout</h2>
        <span className="text-[10px] text-muted-foreground">Click to enlarge</span>
       </header>
       {/* Compact preview — caps the rendered height so the section
         doesn't dominate the page. Click opens full-size in a new tab. */}
       <div className="p-3">
        <a
         href={event.layout_image_url}
         target="_blank"
         rel="noopener noreferrer"
         className="block"
         title="Open full-size layout"
        >
         {/* eslint-disable-next-line @next/next/no-img-element */}
         <img
          src={event.layout_image_url}
          alt="Seating layout"
          className="mx-auto max-h-48 w-auto max-w-full rounded-md border border-border bg-muted object-contain"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
         />
        </a>
       </div>
      </section>
     )}
     </div>
     </div>

     {/* ---- Step 1: Pay (attendee + gift) ---- */}
     {step === 1 && (
     <>
     {/* Step header — quick orientation + summary chip so the buyer remembers
       what they're paying for without scrolling to the right rail. */}
     <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
       <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
        Almost there
       </h2>
       <p className="mt-1 text-sm text-muted-foreground">
        Tell us who&rsquo;s coming and you&rsquo;re ready to pay.
       </p>
      </div>
      <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
       <span className="font-semibold">{ticketCount}</span>
       <span className="text-muted-foreground">
        {ticketCount === 1 ? "ticket" : "tickets"} · {formatLkr(total)}
       </span>
      </span>
     </div>

     {/* Attendee details */}
     <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs dark:bg-card/40">
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
       <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        1
       </span>
       <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">Your details</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
         The buyer&rsquo;s confirmation + receipt go here.
        </p>
       </div>
      </header>
      <div className="space-y-4 px-5 py-5">
       {user ? (
        <p className="text-sm text-muted-foreground">
         Tickets will be sent to{" "}
         <span className="font-medium text-foreground">{attendee.email || "—"}</span>
        </p>
       ) : (
        <p className="text-sm text-muted-foreground">
         Checking out as a guest.{" "}
         <Link
          href={`/auth/login?redirect=/events/${eventId}/checkout`}
          className="font-medium text-primary hover:underline"
         >
          Sign in
         </Link>{" "}
         to save your details.
        </p>
       )}

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
        {!user && (
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
        )}
        <FieldGroup id="att-phone" label="Phone" required>
         <Input
          id="att-phone"
          type="tel"
          value={attendee.phone}
          onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })}
          autoComplete="tel"
          placeholder="+94 77 123 4567"
          required
         />
        </FieldGroup>
       </div>

       <p className="text-xs text-muted-foreground">
        We&rsquo;ll text your ticket and event updates to this number.
       </p>
      </div>
     </section>

     {/* Gift recipients — opt-in section so single-ticket buyers aren't
       forced through a "leave blank or fill?" prompt. Only meaningful
       when ticketCount > 1 (or 1 ticket bought for somebody else). */}
     {ticketCount > 0 && (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs dark:bg-card/40">
       <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
         <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          2
         </span>
         <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Send tickets to others?</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
           Buying for friends or family? Add their email so each person gets their own ticket.
          </p>
         </div>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 self-center rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs">
         <input
          type="checkbox"
          checked={giftMode}
          onChange={(e) => setGiftMode(e.target.checked)}
          className="h-4 w-4 rounded border-border"
         />
         <span className="font-medium">Different attendees</span>
        </label>
       </header>
       {giftMode && (
        <div className="space-y-3 px-5 py-5">
         {recipients.map((r, i) => (
          <div
           key={i}
           className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-muted/30 p-3 sm:grid-cols-[1.5rem_1fr_1fr]"
          >
           <div className="hidden h-full items-center justify-center text-xs font-semibold text-muted-foreground sm:flex">
            #{i + 1}
           </div>
           <Input
            type="text"
            value={r.name}
            onChange={(e) => {
             const next = [...recipients]
             next[i] = { ...next[i], name: e.target.value }
             setRecipients(next)
            }}
            placeholder={`Attendee ${i + 1} name`}
            autoComplete="off"
           />
           <Input
            type="email"
            value={r.email}
            onChange={(e) => {
             const next = [...recipients]
             next[i] = { ...next[i], email: e.target.value }
             setRecipients(next)
            }}
            placeholder="email@example.com"
            autoComplete="off"
           />
          </div>
         ))}
         <p className="text-[11px] text-muted-foreground">
          Leave an attendee blank to send that ticket to you (the buyer). The buyer
          always receives the full booking confirmation.
         </p>
        </div>
       )}
      </section>
     )}
     </>
     )}

     {/* Mobile: primary action — Continue on step 0, Pay on step 1. */}
     <div className="lg:hidden">
      {step === 0 ? (
       <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={advanceToPay}
        disabled={isReserved ? selectedSeats.length === 0 : !selectedTt}
       >
        Continue to payment
       </Button>
      ) : (
       <div className="flex flex-col gap-2">
        <Button
         type="submit"
         size="lg"
         className="w-full"
         disabled={submitting || (isReserved ? selectedSeats.length === 0 : !selectedTt)}
        >
         <Lock />
         {submitting ? "Processing…" : total === 0 ? "Reserve" : `Pay ${formatLkr(total)}`}
        </Button>
        <button
         type="button"
         onClick={() => setStep(0)}
         className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
         ← Back to seats
        </button>
       </div>
      )}
     </div>
    </div>

    {/* Right: sticky order summary — explicit brighter shade in dark mode
        so seat labels, prices, and the total stay readable against the
        deep page background. Stays in the theme's purple-violet hue. */}
    <aside className="lg:col-span-1">
     <div className="sticky top-20 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs dark:bg-card/40">
      <h2 className="text-base font-semibold text-foreground">Order summary</h2>

      {selectedTt || isReserved ? (
       <>
        {selectedTt && !isReserved && (
         <SummaryRow
          label={`${selectedTt.name} × ${quantity}`}
          value={formatLkr(selectedTt.price * quantity)}
         />
        )}
        {isReserved && selectedSeats.length > 0 && (
         <div className="space-y-1.5">
          {selectedSeats.map((s) => (
           <SummaryRow
            key={s.id}
            label={
             <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs font-medium text-foreground">{s.seat_label}</span>
              <span className="text-muted-foreground/70">·</span>
              <span>{s.ticket_type_name}</span>
             </span>
            }
            value={formatLkr(s.price)}
           />
          ))}
         </div>
        )}

        {/* Promo code input. Only meaningful once we have a subtotal. */}
        {subtotal > 0 && (
         <div className="border-t border-border pt-3">
          {promoApplied ? (
           <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
             Code <span className="font-mono">{promoApplied.code}</span> applied
            </span>
            <button
             type="button"
             onClick={() => { setPromoApplied(null); setPromoInput(""); setPromoError("") }}
             className="text-xs text-emerald-700 underline hover:opacity-80 dark:text-emerald-400"
            >
             Remove
            </button>
           </div>
          ) : (
           <div className="space-y-1.5">
            <div className="flex gap-2">
             <Input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Promo code"
              autoComplete="off"
              className="font-mono uppercase"
             />
             <Button
              type="button"
              variant="outline"
              onClick={applyPromo}
              disabled={promoChecking || !promoInput.trim()}
             >
              {promoChecking ? "Checking…" : "Apply"}
             </Button>
            </div>
            {promoError && (
             <p className="text-xs text-destructive">{promoError}</p>
            )}
           </div>
          )}
         </div>
        )}

        {discount > 0 && (
         <SummaryRow
          label="Discount"
          value={`− ${formatLkr(discount)}`}
         />
        )}

        {/* Sub Total + Convenience Fee — the customer's pre-payment summary.
            Only shown once there's actually a subtotal so an empty order
            doesn't render two zero-LKR lines. */}
        {subtotal > 0 && (
         <>
          <SummaryRow label="Sub Total" value={formatLkr(subtotalAfterDiscount)} />
          <SummaryRow
           label={`Convenience Fee (${(convenienceFeePct * 100).toFixed(convenienceFeePct * 100 % 1 === 0 ? 0 : 1)}%)`}
           value={`+ ${formatLkr(convenienceFee)}`}
          />
         </>
        )}

        <div className="border-t border-border pt-3">
         <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-foreground">{formatLkr(total)}</span>
         </div>
        </div>
       </>
      ) : (
       <p className="text-sm text-muted-foreground">
        {isReserved ? "Pick seats to see the total." : "Pick a ticket type to see the total."}
       </p>
      )}

      {/* Step-aware primary action.
            · step 0 → "Continue to payment" — type=button, advances to step 1.
            · step 1 → "Pay" — type=submit, fires handleCheckout. Back link
              below it returns to step 0 without losing seat selection. */}
      {step === 0 ? (
       <Button
        type="button"
        size="lg"
        className="hidden w-full lg:inline-flex"
        onClick={advanceToPay}
        disabled={isReserved ? selectedSeats.length === 0 : !selectedTt}
       >
        Continue to payment
       </Button>
      ) : (
       <>
        <Button
         type="submit"
         size="lg"
         className="hidden w-full lg:inline-flex"
         disabled={submitting || (isReserved ? selectedSeats.length === 0 : !selectedTt)}
        >
         <Lock />
         {submitting ? "Processing…" : total === 0 ? "Reserve" : `Pay ${formatLkr(total)}`}
        </Button>
        <button
         type="button"
         onClick={() => setStep(0)}
         className="hidden w-full text-center text-sm text-muted-foreground hover:text-foreground lg:inline-block"
        >
         ← Back to seats
        </button>
       </>
      )}

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
      </div>
      {ticket.description && (
       <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
      )}
      {!soldOut && (
       <p className="mt-1 text-xs text-muted-foreground">
        Max {ticket.per_order_limit} per order
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

function SummaryRow({ label, value }: { label: React.ReactNode; value: string }) {
 return (
  <div className="flex items-baseline justify-between text-sm">
   <span className="min-w-0 truncate pr-2 text-muted-foreground">{label}</span>
   <span className="shrink-0 font-medium text-foreground">{value}</span>
  </div>
 )
}

// CheckoutSteps + CHECKOUT_STEPS moved to @/components/checkout/checkout-steps
// so the same strip can render on the payment page (/bookings/event/[id])
// with activeIndex={2}, keeping the flow visually continuous.
