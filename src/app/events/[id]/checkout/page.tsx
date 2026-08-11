"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
 AlertCircle,
 ArrowLeft,
 BadgeCheck,
 CalendarClock,
 Check,
 Loader,
 Lock,
 Maximize2,
 Minus,
 Plus,
} from "lucide-react"
import toast from "react-hot-toast"
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
  type SelectedFreeSeating,
} from "@/components/events/seat-map-picker"
import { pickBestOffer, type EventOffer } from "@/lib/offers"
import { launchMpgsCheckout } from "@/lib/mpgsCheckout"
import { launchKokoCheckout } from "@/lib/kokoCheckout"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Koko (BNPL) is opt-in — the KOKO payment option only appears when this is
// set. Card (MPGS) is always available.
const KOKO_ENABLED = process.env.NEXT_PUBLIC_KOKO_ENABLED === "true"

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
 // Auto-applied bulk-purchase offers configured by the organizer. The
 // server already runs the same evaluator at POST /checkout — we mirror
 // it client-side so the cart shows a preview before the buyer commits.
 offers?: EventOffer[]
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
 const { user, loading: authLoading, checkAuth } = useAuth()

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
 // Selected payment gateway on the merged (billing + payment) step. 'card' →
 // MPGS; 'koko' → Koko BNPL (only user-selectable when KOKO_ENABLED).
 const [paymentMethod, setPaymentMethod] = React.useState<"card" | "koko">("card")
 // Step-1 transition: validate that the user has actually picked seats /
 // a ticket type before showing the Pay screen, and reset any prior submit
 // error so the new screen renders clean.
 const advanceToPay = React.useCallback(() => {
  setSubmitError("")
  if (typeof window !== "undefined") {
   window.scrollTo({ top: 0, behavior: "smooth" })
   // Choose and Details & Pay are one URL (just this `step` state), so
   // without a history entry the browser's back button skips straight past
   // step 0 and leaves checkout entirely. Push one so back returns to Choose.
   window.history.pushState({ checkoutStep: 1 }, "")
  }
  setStep(1)
 }, [])

 // Browser back button while on step 1 → step 0, instead of leaving checkout.
 React.useEffect(() => {
  const onPopState = () => setStep(0)
  window.addEventListener("popstate", onPopState)
  return () => window.removeEventListener("popstate", onPopState)
 }, [])

 // Non-reserved cart: per-tier quantities keyed by ticket_type_id. A tier with
 // qty > 0 is "in the cart" — buyers can now mix multiple categories in a single
 // order (e.g. 2× VIP + 3× Regular). Seeded from the ?tt=&qty= deep link when
 // present; otherwise starts empty and the buyer increments per category.
 const [quantities, setQuantities] = React.useState<Record<string, number>>(
  ttFromUrl && qtyFromUrl && qtyFromUrl > 0 ? { [ttFromUrl]: qtyFromUrl } : {},
 )
 const [attendee, setAttendee] = React.useState({ firstName: "", lastName: "", email: "", phone: "", nic: "" })
 // Compulsory Terms & Conditions acceptance before payment.
 const [acceptedTerms, setAcceptedTerms] = React.useState(false)
 // True right after a submit attempt was blocked on the checkbox — highlights
 // the checkbox itself instead of a generic top-of-page error.
 const [termsError, setTermsError] = React.useState(false)
 // Inline profile-phone verification on this step, for logged-in buyers only.
 // Once verified here, EVERY future booking with this number skips
 // verification too (same as the profile page's PhoneVerifyCard — this is
 // just that flow surfaced inline so buyers don't have to leave checkout).
 const [phoneOtpStep, setPhoneOtpStep] = React.useState<"idle" | "sent">("idle")
 const [phoneOtp, setPhoneOtp] = React.useState("")
 const [sendingPhoneOtp, setSendingPhoneOtp] = React.useState(false)
 const [verifyingPhoneOtp, setVerifyingPhoneOtp] = React.useState(false)
 const [phoneOtpSentTo, setPhoneOtpSentTo] = React.useState("")

 // True once the number in the form matches the buyer's already-verified
 // profile number — no need to verify again.
 const phoneIsVerified =
  !!user?.phone_verified && !!user.phone && user.phone.trim() === attendee.phone.trim()

 const requestPhoneOtp = async () => {
  const value = attendee.phone.trim()
  if (!value) {
   toast.error("Enter a phone number first.")
   return
  }
  setSendingPhoneOtp(true)
  try {
   const res = await fetch(`${API_URL}/api/user/phone/request-otp`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: value }),
   })
   const body = await res.json()
   if (body?.success) {
    setPhoneOtpSentTo(body.data?.sent_to_last4 || value.slice(-4))
    setPhoneOtpStep("sent")
    toast.success("Verification code sent.")
   } else {
    toast.error(body?.message || "Couldn't send the code.")
   }
  } catch {
   toast.error("Network error sending the code.")
  } finally {
   setSendingPhoneOtp(false)
  }
 }

 const verifyPhoneOtp = async () => {
  const code = phoneOtp.trim()
  if (!code) {
   toast.error("Enter the code.")
   return
  }
  setVerifyingPhoneOtp(true)
  try {
   const res = await fetch(`${API_URL}/api/user/phone/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp: code }),
   })
   const body = await res.json()
   if (body?.success) {
    toast.success("Phone verified.")
    await checkAuth()
    setPhoneOtpStep("idle")
    setPhoneOtp("")
   } else {
    toast.error(body?.message || "Verification failed.")
   }
  } catch {
   toast.error("Network error verifying the code.")
  } finally {
   setVerifyingPhoneOtp(false)
  }
 }

 // Reserved-mode state — seat picker manages its own list, parent just holds the result.
 const [selectedSeats, setSelectedSeats] = React.useState<SelectedSeat[]>([])
 // Free-seating (GA) tier quantities — populated by the picker for events
 // that mix reserved sections with general-admission zones. Empty for the
 // common all-reserved case.
 const [freeSeating, setFreeSeating] = React.useState<SelectedFreeSeating[]>([])
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
 // Total tickets across reserved-seat picks AND free-seating quantities,
 // when reserved. Drives the gift-recipient input count and the buttons'
 // disabled state.
 const freeSeatingCount = freeSeating.reduce((s, f) => s + f.quantity, 0)

 // Max buyable for a non-reserved tier = min(per-order limit, remaining stock).
 const maxForTier = React.useCallback(
  (tt: TicketType) => Math.max(0, Math.min(tt.per_order_limit, tt.quantity_total - tt.quantity_sold)),
  [],
 )
 // Resolved non-reserved cart: event tiers the buyer has given a qty > 0,
 // paired with their tier row. Drives pricing, the summary, and the payload.
 const nonReservedCart = React.useMemo(() => {
  if (isReserved || !event?.ticket_types) return [] as { tt: TicketType; qty: number }[]
  return event.ticket_types
   .map((tt) => ({ tt, qty: quantities[tt.id] || 0 }))
   .filter((l) => l.qty > 0)
 }, [isReserved, event?.ticket_types, quantities])
 const nonReservedCount = nonReservedCart.reduce((s, l) => s + l.qty, 0)
 const nonReservedSubtotal = nonReservedCart.reduce((s, l) => s + Number(l.tt.price) * l.qty, 0)

 const ticketCount = isReserved
   ? selectedSeats.length + freeSeatingCount
   : nonReservedCount

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
   const parts = (user.name || "").trim().split(/\s+/).filter(Boolean)
   setAttendee((prev) => ({
    ...prev,
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
    email: user.email || "",
    phone: user.phone || "",
    // Prefill NIC from the profile if the buyer saved one before; still editable.
    nic: user.nic || prev.nic || "",
   }))
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
    // If the URL deep-linked a tier and it's still available, seed the cart
    // with it (clamped to its per-order + stock limits). Otherwise leave the
    // cart empty — the buyer adds quantities per category below.
    const preselected = ttFromUrl
     ? e.ticket_types?.find((t) => t.id === ttFromUrl && t.quantity_total - t.quantity_sold > 0)
     : null
    if (preselected) {
     const available = preselected.quantity_total - preselected.quantity_sold
     const max = Math.max(1, Math.min(preselected.per_order_limit, available))
     setQuantities((prev) => ({
      ...prev,
      [preselected.id]: Math.max(1, Math.min(prev[preselected.id] || 1, max)),
     }))
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

 const subtotal = isReserved ? seatTotal : nonReservedSubtotal

 // Build cart lines for the offer evaluator. Reserved: one line per seat
 // at the seat's tier price. Free-seating + non-reserved: one line per
 // ticket-type qty. Matches the shape lib/offerEvaluator.js expects
 // server-side so cart preview === actual checkout discount.
 const offerCartLines = React.useMemo(() => {
   if (isReserved) {
     return [
       ...selectedSeats.map(s => ({
         ticket_type_id: s.ticket_type_id ?? null,
         unit_price: Number(s.price) || 0,
         quantity: 1,
       })),
       ...freeSeating.map(f => ({
         ticket_type_id: f.ticket_type_id,
         unit_price: Number(f.price) || 0,
         quantity: f.quantity,
       })),
     ]
   }
   return nonReservedCart.map((l) => ({
     ticket_type_id: l.tt.id,
     unit_price: Number(l.tt.price) || 0,
     quantity: l.qty,
   }))
 }, [isReserved, selectedSeats, freeSeating, nonReservedCart])

 const appliedOffer = React.useMemo(
   () => pickBestOffer(event?.offers ?? null, offerCartLines),
   [event?.offers, offerCartLines],
 )
 const offerDiscount = appliedOffer?.discount ?? 0

 const promoDiscount = promoApplied?.discount ?? 0
 // Offer applies first, promo stacks on the post-offer subtotal (same
 // ordering the server uses at POST /checkout).
 const subtotalAfterOffer = Math.max(0, subtotal - offerDiscount)
 const discount = promoDiscount
 const subtotalAfterDiscount = Math.max(0, subtotalAfterOffer - promoDiscount)
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

  if (!attendee.firstName.trim()) {
   setSubmitError("First name is required.")
   return
  }
  if (!attendee.email.trim()) {
   setSubmitError("Email is required.")
   return
  }
  if (!attendee.phone.trim()) {
   setSubmitError("Phone number is required for SMS updates.")
   return
  }
  if (!attendee.nic.trim()) {
   setSubmitError("NIC / Passport is required.")
   return
  }
  if (!acceptedTerms) {
   // Highlight the checkbox itself rather than a generic top-of-page error —
   // it's right there next to the button the buyer just clicked.
   setTermsError(true)
   return
  }
  setTermsError(false)

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
   const freeQtyTotal = freeSeating.reduce((s, f) => s + f.quantity, 0)
   if (selectedSeats.length === 0 && freeQtyTotal === 0) {
    setSubmitError("Pick at least one seat or general admission ticket.")
    return
   }
   body = {
    event_id: event!.id,
    seat_ids: selectedSeats.map((s) => s.id),
    // Free-seating tier quantities — backend reserves GA inventory via
    // reserve_tickets() per entry, atomic with hold_seats for the
    // per-seat picks. Empty array is fine and omitted to keep the
    // payload minimal for the common all-reserved case.
    ...(freeSeating.length ? {
     free_seating: freeSeating.map(f => ({
      ticket_type_id: f.ticket_type_id,
      quantity: f.quantity,
     })),
    } : {}),
    attendee_info: {
     name: `${attendee.firstName.trim()} ${attendee.lastName.trim()}`.trim() || undefined,
     email: attendee.email.trim() || undefined,
     phone: attendee.phone.trim() || undefined,
     nic: attendee.nic.trim() || undefined,
    },
    ...(giftPayload.length ? { recipients: giftPayload } : {}),
    ...(promoApplied ? { promo_code: promoApplied.code } : {}),
   }
  } else {
   if (nonReservedCart.length === 0) {
    setSubmitError("Add at least one ticket.")
    return
   }
   // Multi-category cart: one line per tier with qty > 0. Backend also accepts
   // the legacy { ticket_type_id, quantity } shape, but we always send items[].
   body = {
    event_id: event!.id,
    items: nonReservedCart.map((l) => ({ ticket_type_id: l.tt.id, quantity: l.qty })),
    attendee_info: {
     name: `${attendee.firstName.trim()} ${attendee.lastName.trim()}`.trim() || undefined,
     email: attendee.email.trim() || undefined,
     phone: attendee.phone.trim() || undefined,
     nic: attendee.nic.trim() || undefined,
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
   const bookingId = data.data.booking.id as string
   // The booking page doubles as the post-payment confirmation screen AND the
   // fallback if we can't launch the gateway from here — same URL either way.
   const bookingUrl = `/bookings/event/${bookingId}${guestToken ? `?t=${encodeURIComponent(guestToken)}` : ""}`

   // Free bookings auto-confirm server-side — no gateway needed.
   if (total === 0) {
    router.push(bookingUrl)
    return
   }

   // Otherwise launch the chosen gateway right here (merged checkout) so the
   // buyer never sees an intermediate page. On ANY payment-init failure we
   // fall back to the booking page, where the existing pay button lets them
   // retry — the booking (Pending) is never lost.
   const initBody = JSON.stringify({ bookingId, ...(guestToken ? { guestToken } : {}) })
   try {
    if (KOKO_ENABLED && paymentMethod === "koko") {
     const kres = await fetch(`${API_URL}/api/payments/initialize-event-koko`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: initBody,
     })
     const kbody = await kres.json()
     if (!kbody?.success) { router.push(bookingUrl); return }
     // Full-page form POST to Koko; verdict returns via the signed webhook.
     launchKokoCheckout({ actionUrl: kbody.data.actionUrl, fields: kbody.data.fields })
     return
    }
    const pres = await fetch(`${API_URL}/api/payments/initialize-event`, {
     method: "POST",
     credentials: "include",
     headers: { "Content-Type": "application/json" },
     body: initBody,
    })
    const pbody = await pres.json()
    if (!pbody?.success) { router.push(bookingUrl); return }
    await launchMpgsCheckout({
     sessionId: pbody.data.sessionId,
     checkoutJsUrl: pbody.data.checkoutJsUrl,
     // These fire only for problems BEFORE the browser leaves for MPGS (bad
     // session, SDK config) — fall back to the booking page to retry.
     onCancel: () => router.push(bookingUrl),
     onError: () => router.push(bookingUrl),
    })
   } catch {
    // Booking exists but we couldn't start payment — send them to the
    // booking page to retry rather than stranding them here.
    router.push(bookingUrl)
   }
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
  <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">

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

   <form onSubmit={handleCheckout} className="grid grid-cols-1 gap-6 lg:grid-cols-5">
    {/* Left: step 0 = ticket / seat selection · step 1 = attendee form */}
    <div className="space-y-6 lg:col-span-3">
     {/* ---- Step 0: Choose ----
       Rendered always (just hidden on step 1) so the SeatMapPicker stays
       mounted across the wizard. Unmounting it would fire the picker's
       cleanup effect and `POST /seats/release` every held seat — i.e. the
       user's holds vanish the moment they click "Continue to payment". */}
     <div className={step === 0 ? undefined : "hidden"}>
     <div className="space-y-6">
     {/* Reserved-seating: seat map. Other modes: ticket-type list. */}
     {isReserved ? (
      <section className="overflow-hidden rounded-2xl border border-border bg-card dark:bg-card/80 dark:backdrop-blur-sm p-5 shadow-xs">
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
         {(() => {
           const freeCount = freeSeating.reduce((s, f) => s + f.quantity, 0)
           const total = selectedSeats.length + freeCount
           return (
             <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium dark:bg-card/40">
               <span className="font-semibold text-foreground">{total}</span>
               <span className="text-muted-foreground">
                 {total === 1 ? "ticket" : "tickets"} selected
               </span>
             </span>
           )
         })()}
        </div>
       </header>
       <SeatMapPicker
        eventId={event.id}
        maxPerOrder={8}
        zoom={seatZoom}
        onZoomChange={setSeatZoom}
        onSelectionChange={(seats, total, free) => {
         setSelectedSeats(seats)
         setFreeSeating(free)
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
     <section className="overflow-hidden rounded-2xl border border-border bg-card dark:bg-card/80 dark:backdrop-blur-sm shadow-xs">
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
          qty={quantities[tt.id] || 0}
          max={maxForTier(tt)}
          onChange={(next) =>
           setQuantities((prev) => {
            const copy = { ...prev }
            if (next <= 0) delete copy[tt.id]
            else copy[tt.id] = next
            return copy
           })
          }
         />
        ))}
       </ul>
      )}
     </section>
      )
     })()
     )}

     {/* Seating / zone layout — a reference map the organizer uploaded.
       Zooms in-place (no new tab) via the +/− controls. Placed below the
       ticket picker so users see the picker first, then can consult the
       map before confirming their choice. */}
     {event.layout_image_url && (
      <LayoutImageZoom imageUrl={event.layout_image_url} />
     )}
     </div>
     </div>

     {/* ---- Step 1: Pay (attendee + gift) ---- */}
     {step === 1 && (
     <>
     {/* Step header — quick orientation + summary chip so the buyer remembers
       what they're paying for without scrolling to the right rail. */}
     <div>
      <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
       Billing Information
      </h2>
     </div>

     {/* Attendee details */}
     <section className="overflow-hidden rounded-2xl border border-border bg-card dark:bg-card/80 dark:backdrop-blur-sm shadow-xs">
      <div className="space-y-4 px-5 py-5">
       {!user && (
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

       {/* Placeholders double as the field titles — no separate labels. */}
       <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <Input
         id="att-first"
         type="text"
         value={attendee.firstName}
         onChange={(e) => setAttendee({ ...attendee, firstName: e.target.value })}
         autoComplete="given-name"
         placeholder="First Name"
         aria-label="First Name"
         required
        />
        <Input
         id="att-last"
         type="text"
         value={attendee.lastName}
         onChange={(e) => setAttendee({ ...attendee, lastName: e.target.value })}
         autoComplete="family-name"
         placeholder="Last Name"
         aria-label="Last Name"
        />
        <Input
         id="att-email"
         type="email"
         value={attendee.email}
         onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
         autoComplete="email"
         placeholder="Email Address"
         aria-label="Email Address"
         // Logged-in buyers sign in with this email — it can't be changed
         // here. Guests have no account, so theirs stays editable.
         readOnly={!!user}
         className={cn(user && "cursor-not-allowed bg-muted/50 text-muted-foreground")}
         required
        />
        <div className="space-y-2">
         <Input
          id="att-phone"
          type="tel"
          value={attendee.phone}
          onChange={(e) => {
           setAttendee({ ...attendee, phone: e.target.value })
           // Editing the number invalidates any in-flight code for the old one.
           setPhoneOtpStep("idle")
           setPhoneOtp("")
          }}
          autoComplete="tel"
          placeholder="Phone Number"
          aria-label="Phone Number"
          // Locked once verified — "Change number" below explicitly unlocks it.
          readOnly={phoneIsVerified}
          className={cn(phoneIsVerified && "cursor-not-allowed bg-muted/50 text-muted-foreground")}
          required
         />
         {user && attendee.phone.trim() && (
          phoneIsVerified ? (
           <span className="inline-flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
             <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
            <button
             type="button"
             onClick={() => setAttendee({ ...attendee, phone: "" })}
             className="font-medium text-primary hover:underline"
            >
             Change number
            </button>
           </span>
          ) : phoneOtpStep === "idle" ? (
           <button
            type="button"
            onClick={requestPhoneOtp}
            disabled={sendingPhoneOtp}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
           >
            {sendingPhoneOtp && <Loader className="h-3 w-3 animate-spin" />}
            {sendingPhoneOtp ? "Sending code…" : "Verify this number"}
           </button>
          ) : (
           <div className="flex flex-wrap items-center gap-2">
            <input
             type="text"
             inputMode="numeric"
             autoComplete="one-time-code"
             value={phoneOtp}
             onChange={(e) => setPhoneOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
             placeholder="6-digit code"
             className="h-8 w-32 rounded-md border border-input bg-transparent px-2.5 text-sm tracking-widest text-foreground placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
            />
            <button
             type="button"
             onClick={verifyPhoneOtp}
             disabled={verifyingPhoneOtp}
             className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
            >
             {verifyingPhoneOtp ? <Loader className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
             Verify
            </button>
            <span className="text-xs text-muted-foreground">
             Sent to ****{phoneOtpSentTo}
            </span>
           </div>
          )
         )}
        </div>
        <div className="sm:col-span-2">
         <Input
          id="att-nic"
          type="text"
          value={attendee.nic}
          onChange={(e) => setAttendee({ ...attendee, nic: e.target.value })}
          autoComplete="off"
          placeholder="NIC / Passport"
          aria-label="NIC / Passport"
          required
         />
        </div>
       </div>

       <p className="text-xs text-muted-foreground">
        We&rsquo;ll text your ticket and event updates to your phone number.
       </p>
      </div>
     </section>

     {/* Gift recipients — opt-in section so single-ticket buyers aren't
       forced through a "leave blank or fill?" prompt. Only meaningful
       when ticketCount > 1 (or 1 ticket bought for somebody else). */}
     {ticketCount > 0 && (
      <section className="overflow-hidden rounded-2xl border border-border bg-card dark:bg-card/80 dark:backdrop-blur-sm shadow-xs">
       <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
         <h2 className="text-base font-semibold text-foreground">Send tickets to others?</h2>
         <p className="mt-0.5 text-xs text-muted-foreground">
          Buying for friends or family? Add their email so each person gets their own ticket.
         </p>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 self-center rounded-full border border-border px-3 py-1.5 text-xs">
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
           className="grid grid-cols-1 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[1.5rem_1fr_1fr]"
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

    </div>

    {/* Right: sticky order summary — explicit brighter shade in dark mode
        so seat labels, prices, and the total stay readable against the
        deep page background. Stays in the theme's purple-violet hue. */}
    <aside className="lg:col-span-2">
     <div className="sticky top-20 space-y-3 rounded-2xl border border-border bg-card dark:bg-card/80 dark:backdrop-blur-sm p-5 shadow-xs">
      {/* Event header — banner + name + date + venue, so the buyer keeps sight
          of what they're paying for. */}
      <div className="flex items-start gap-3">
       {event.banner_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
         src={event.banner_url}
         alt=""
         className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
       ) : null}
       <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{event.title}</p>
        {(event.start_time || event.date) && (
         <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date((event.start_time || event.date)!).toLocaleString("en-US", {
           month: "short",
           day: "numeric",
           hour: "numeric",
           minute: "2-digit",
          })}
         </p>
        )}
        {event.venue_name && (
         <p className="truncate text-xs text-muted-foreground">{event.venue_name}</p>
        )}
       </div>
      </div>
      <div className="border-t border-border" />

      <h2 className="text-base font-semibold text-foreground">Order summary</h2>

      {nonReservedCount > 0 || isReserved ? (
       <>
        {!isReserved && nonReservedCart.length > 0 && (
         <div className="space-y-1.5">
          {nonReservedCart.map((l) => (
           <SummaryRow
            key={l.tt.id}
            label={`${l.tt.name} × ${l.qty}`}
            value={formatLkr(Number(l.tt.price) * l.qty)}
           />
          ))}
         </div>
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
        {/* Free-seating (GA) tier rows — one per tier with quantity. Shown
            alongside the reserved per-seat rows so the buyer sees the
            combined order in one place. */}
        {isReserved && freeSeating.length > 0 && (
         <div className="space-y-1.5">
          {freeSeating.map((f) => (
           <SummaryRow
            key={f.ticket_type_id}
            label={
             <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-foreground">{f.ticket_type_name}</span>
              <span className="text-muted-foreground/70">×</span>
              <span className="font-medium text-foreground">{f.quantity}</span>
             </span>
            }
            value={formatLkr(f.price * f.quantity)}
           />
          ))}
         </div>
        )}

        {/* Promo code input. Only meaningful once we have a subtotal. */}
        {subtotal > 0 && (
         <div className="border-t border-border pt-3">
          {promoApplied ? (
           <div className="flex items-center justify-between px-3 py-2 text-sm">
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

        {appliedOffer && offerDiscount > 0 && (
         <SummaryRow
          label={
           <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="font-medium">Offer applied</span>
            <span className="text-muted-foreground">· {appliedOffer.offer.name}</span>
           </span>
          }
          value={`− ${formatLkr(offerDiscount)}`}
         />
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
          {/* Convenience fee is only surfaced on the Details & Pay step — the
              ticket-choosing step shows the plain subtotal. */}
          {step === 1 && (
           <SummaryRow
            label={`Convenience Fee (${(convenienceFeePct * 100).toFixed(convenienceFeePct * 100 % 1 === 0 ? 0 : 1)}%)`}
            value={`+ ${formatLkr(convenienceFee)}`}
           />
          )}
         </>
        )}

        <div className="border-t border-border pt-3">
         <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-foreground">
           {formatLkr(step === 1 ? total : subtotalAfterDiscount)}
          </span>
         </div>
        </div>
       </>
      ) : (
       <p className="text-sm text-muted-foreground">
        {isReserved ? "Pick seats to see the total." : "Pick a ticket type to see the total."}
       </p>
      )}

      {/* Payment Method — shown on the pay step, right above the CTA so the
          buyer picks how to pay and confirms in one place. */}
      {step === 1 && (
       <div className="space-y-2 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">Payment Method</p>
        <label className="flex cursor-pointer items-start gap-2.5 px-1 py-2">
         <input
          type="radio"
          name="paymentMethod"
          value="card"
          checked={paymentMethod === "card"}
          onChange={() => setPaymentMethod("card")}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
         />
         <span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Images/payment.jpeg" alt="Card, Wallets & Banking" className="h-6 w-auto rounded object-contain" />
          <span className="mt-1 block text-xs text-muted-foreground">Visa, Mastercard </span>
         </span>
        </label>
        {KOKO_ENABLED && (
         <label className="flex cursor-pointer items-start gap-2.5 px-1 py-2">
          <input
           type="radio"
           name="paymentMethod"
           value="koko"
           checked={paymentMethod === "koko"}
           onChange={() => setPaymentMethod("koko")}
           className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span>
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img src="/Images/koko.png" alt="KOKO" className="h-5 w-auto object-contain" />
           <span className="mt-1 block text-xs text-muted-foreground">Buy Now, Pay Later</span>
          </span>
         </label>
        )}
       </div>
      )}

      {/* Compulsory Terms & Conditions — right above the pay button, gating it.
          On a blocked submit, the checkbox itself glows instead of showing a
          generic error elsewhere on the page. */}
      {step === 1 && (
       <label className="flex cursor-pointer items-start gap-2.5 p-1 text-sm text-foreground">
        <input
         type="checkbox"
         checked={acceptedTerms}
         onChange={(e) => {
          setAcceptedTerms(e.target.checked)
          if (e.target.checked) setTermsError(false)
         }}
         className={cn(
          "mt-0.5 h-4 w-4 shrink-0 rounded accent-primary transition-shadow",
          termsError && "animate-pulse shadow-[0_0_10px_3px_var(--color-destructive)] ring-2 ring-destructive",
         )}
        />
        <span>
         I accept and agree to the{" "}
         <Link href="/terms" target="_blank" className="font-medium text-primary hover:underline">
          Terms and Conditions
         </Link>
        </span>
       </label>
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
        disabled={isReserved ? ticketCount === 0 : nonReservedCount === 0}
       >
        Continue to payment
       </Button>
      ) : (
       <>
        <Button
         type="submit"
         size="lg"
         className="hidden w-full lg:inline-flex"
         disabled={submitting || (isReserved ? ticketCount === 0 : nonReservedCount === 0)}
        >
         {submitting ? "Processing…" : total === 0 ? "Reserve" : `Pay ${formatLkr(total)}`}
        </Button>
        <button
         type="button"
         onClick={() => window.history.back()}
         className="hidden w-full text-center text-sm text-muted-foreground hover:text-foreground lg:inline-block"
        >
         ← Back to seats
        </button>
       </>
      )}

      {/* Mobile: primary action — Continue on step 0, Pay on step 1.
          Placed here (inside the order summary card) so it renders below
          Order summary on mobile, where the grid collapses to one column. */}
      <div className="lg:hidden">
       {step === 0 ? (
        <Button
         type="button"
         size="lg"
         className="w-full"
         onClick={advanceToPay}
         disabled={isReserved ? ticketCount === 0 : nonReservedCount === 0}
        >
         Continue to payment
        </Button>
       ) : (
        <div className="flex flex-col gap-2">
         <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || (isReserved ? ticketCount === 0 : nonReservedCount === 0)}
         >
          {submitting ? "Processing…" : total === 0 ? "Reserve" : `Pay ${formatLkr(total)}`}
         </Button>
         <button
          type="button"
          onClick={() => window.history.back()}
          className="text-center text-sm text-muted-foreground hover:text-foreground"
         >
          ← Back to seats
         </button>
        </div>
       )}
      </div>

     </div>
    </aside>
   </form>
  </div>
 )
}

function TicketTypeOption({
 ticket,
 qty,
 max,
 onChange,
}: {
 ticket: TicketType
 qty: number
 max: number
 onChange: (next: number) => void
}) {
 const remaining = Math.max(0, ticket.quantity_total - ticket.quantity_sold)
 const soldOut = remaining <= 0 || max <= 0
 const price = Number(ticket.price)
 const active = qty > 0

 return (
  <li className={cn("px-5 py-4 transition-colors", active && "bg-primary/5", soldOut && "opacity-55")}>
   <div className="flex items-center gap-4">
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
     <p className="mt-1 text-sm font-medium text-foreground">
      {price === 0
       ? "Free"
       : `LKR ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
     </p>
    </div>

    {/* Per-tier stepper — always visible as −/[qty]/+ (starts at 0). Minus is
        disabled at 0; plus is clamped to the tier's max (limit ∧ stock). */}
    <div className="shrink-0">
     {soldOut ? null : (
      <div className="flex items-center rounded-2xl border border-border bg-card dark:bg-card/80 dark:backdrop-blur-sm">
       <button
        type="button"
        onClick={() => onChange(Math.max(0, qty - 1))}
        disabled={qty <= 0}
        aria-label={`Decrease ${ticket.name} quantity`}
        className="flex h-9 w-9 items-center justify-center rounded-l-2xl text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
       >
        <Minus className="h-4 w-4" />
       </button>
       <span className="min-w-10 text-center text-base font-semibold tabular-nums text-foreground">
        {qty}
       </span>
       <button
        type="button"
        onClick={() => onChange(Math.min(max, qty + 1))}
        disabled={qty >= max}
        aria-label={`Increase ${ticket.name} quantity`}
        className="flex h-9 w-9 items-center justify-center rounded-r-2xl text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
       >
        <Plus className="h-4 w-4" />
       </button>
      </div>
     )}
    </div>
   </div>
  </li>
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
// with activeIndex={1} (Details & Pay), keeping the flow visually continuous.

// Inline zoomable view for the organizer-uploaded seating layout image.
// Buyer can zoom in (+) / out (−) / reset (⤢) without leaving the page —
// replaces the previous "open in new tab" affordance per UX feedback.
// Implementation: width-driven scaling on the inner wrapper, with the
// outer container providing the scroll viewport when zoomed beyond fit.
const LAYOUT_MIN_ZOOM = 1
const LAYOUT_MAX_ZOOM = 4
function LayoutImageZoom({ imageUrl }: { imageUrl: string }) {
 const [zoom, setZoom] = React.useState(LAYOUT_MIN_ZOOM)
 const clamp = (v: number) => Math.max(LAYOUT_MIN_ZOOM, Math.min(LAYOUT_MAX_ZOOM, v))
 const zoomIn = () => setZoom(z => clamp(z * 1.25))
 const zoomOut = () => setZoom(z => clamp(z / 1.25))
 const reset = () => setZoom(LAYOUT_MIN_ZOOM)
 const btn = "inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
 return (
  <section className="overflow-hidden rounded-2xl border border-border bg-card dark:bg-card/80 dark:backdrop-blur-sm shadow-xs">
   <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
    <h2 className="text-sm font-semibold text-foreground">Seating layout</h2>
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-sm dark:bg-card/40">
     <button type="button" onClick={zoomOut} disabled={zoom <= LAYOUT_MIN_ZOOM} aria-label="Zoom out" className={btn}>
      <Minus className="h-3.5 w-3.5" />
     </button>
     <span className="min-w-10 text-center text-[11px] font-medium tabular-nums text-muted-foreground">
      {Math.round(zoom * 100)}%
     </span>
     <button type="button" onClick={zoomIn} disabled={zoom >= LAYOUT_MAX_ZOOM} aria-label="Zoom in" className={btn}>
      <Plus className="h-3.5 w-3.5" />
     </button>
     <button type="button" onClick={reset} disabled={zoom === LAYOUT_MIN_ZOOM} aria-label="Reset zoom" className={btn}>
      <Maximize2 className="h-3.5 w-3.5" />
     </button>
    </div>
   </header>
   {/* Scroll container — when zoom > 1 the image grows wider than the
       container and overflow-auto exposes a scrollbar so the buyer can pan
       around. max-h caps the vertical area at 1× so the layout doesn't
       dominate the page; vertical scroll kicks in at higher zooms. */}
   <div className="overflow-auto p-3 max-h-[60vh]">
    <div style={{ width: `${zoom * 100}%` }} className="mx-auto">
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img
      src={imageUrl}
      alt="Seating layout"
      className="block w-full rounded-md border border-border bg-muted object-contain"
      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
     />
    </div>
   </div>
  </section>
 )
}
