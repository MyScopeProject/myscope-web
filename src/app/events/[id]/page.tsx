"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Info,
  Loader,
  MapPin,
  ShieldCheck,
  Tag,
  Ticket,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface TicketType {
  id: string
  name: string
  description?: string | null
  price: number | string
  quantity_total: number
  quantity_sold: number
  per_order_limit?: number
  sale_start?: string | null
  sale_end?: string | null
}

type SeatingMode = "none" | "free" | "zoned" | "reserved"

interface Event {
  id?: string
  _id: string
  title: string
  description: string
  date: string
  start_time?: string
  end_time?: string | null
  location: string
  venue_name?: string
  venue_address?: string | null
  venue_location_url?: string | null
  banner_url?: string | null
  price: number
  tickets_available: number
  tickets_sold: number
  category: string
  organizer: {
    // Brand fields from organizer_profiles — the public face of the organizer.
    // Personal user fields (name, email, profile_image) are intentionally NOT
    // surfaced here; attendees should see the brand, not the person.
    id?: string
    business_name?: string | null
    business_type?: string | null
    phone?: string | null
    profile_image_url?: string | null
    verified?: boolean
    // True when the organizer has resigned or been revoked by an admin. The
    // event itself stays public; we just relabel the organizer card.
    deactivated?: boolean
  }
  attendees: string[]
  status: string
  featured: boolean
  seating_mode?: SeatingMode | null
  ticket_types?: TicketType[]
  // True when the organizer has hit "Pause sales" — event still exists, but
  // every ticket tier is inactive. Surface as "Event on hold" in the UI
  // instead of falling through to the "Free" registration path.
  sales_paused?: boolean
}

const formatLkr = (n: number) =>
  n === 0
    ? "Free"
    : `LKR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const ticketRemaining = (t: TicketType) =>
  Math.max(0, (t.quantity_total ?? 0) - (t.quantity_sold ?? 0))

const ticketStatus = (t: TicketType): "soldout" | "not_started" | "ended" | "available" => {
  if (ticketRemaining(t) <= 0) return "soldout"
  const now = Date.now()
  if (t.sale_start && new Date(t.sale_start).getTime() > now) return "not_started"
  if (t.sale_end && new Date(t.sale_end).getTime() < now) return "ended"
  return "available"
}

const formatLongDate = (d: Date) =>
  d.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

const formatTimeRange = (start: Date, end: Date | null) => {
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(":", ".")
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
}

export default function EventDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const eventId = params?.id
  const { user, token } = useAuth()

  const [event, setEvent] = React.useState<Event | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const fetchEvent = React.useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_URL}/api/events/${eventId}`)
      const data = await res.json()
      if (data?.success) {
        setEvent(data.data.event as Event)
      } else {
        setError(data?.message || "Event not found.")
      }
    } catch {
      setError("Couldn't reach the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  React.useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const handleRegister = async () => {
    if (!user || !token) {
      router.push(`/auth/login?redirect=/events/${eventId}`)
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data?.success) {
        setEvent(data.data.event)
      } else {
        alert(data?.message || "Couldn't register for this event.")
      }
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleUnregister = async () => {
    if (!user || !token) return
    if (!confirm("Cancel your registration for this event?")) return
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/unregister`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data?.success) {
        setEvent(data.data.event)
      } else {
        alert(data?.message || "Couldn't unregister.")
      }
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleContinueToCheckout = () => {
    if (!user) {
      const redirect = `/events/${eventId}/checkout`
      router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`)
      return
    }
    router.push(`/events/${eventId}/checkout`)
  }

  if (loading) return <DetailSkeleton />

  if (error || !event) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold">Event not found</h1>
        <p className="text-muted-foreground">{error || "This event may have been removed or never existed."}</p>
        <Button asChild variant="outline">
          <Link href="/events">
            <ArrowLeft /> Back to events
          </Link>
        </Button>
      </div>
    )
  }

  const ticketsAvailable = event.tickets_available ?? 0
  const ticketsSold = event.tickets_sold ?? 0
  const ticketsRemaining = ticketsAvailable - ticketsSold
  const isSoldOut = ticketsAvailable > 0 && ticketsRemaining <= 0
  const isRegistered = !!user && event.attendees?.includes(user.id)
  const whenIso = event.start_time || event.date
  const dateObj = whenIso ? new Date(whenIso) : null
  const endObj = event.end_time ? new Date(event.end_time) : null
  const venue = event.venue_name || event.location
  const hasTicketTypes = !!event.ticket_types && event.ticket_types.length > 0
  const minTierPrice = hasTicketTypes
    ? Math.min(...event.ticket_types!.map((t) => Number(t.price)))
    : event.price ?? 0
  const maxTierPrice = hasTicketTypes
    ? Math.max(...event.ticket_types!.map((t) => Number(t.price)))
    : event.price ?? 0
  const hasMultipleTiers = hasTicketTypes && event.ticket_types!.length > 1

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Back link */}
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      {/* Hero — cinematic poster + info */}
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-border bg-muted">
        {/* Blurred backdrop */}
        {event.banner_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.banner_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-110 saturate-150"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}

        {/* Floating badges (top-right) */}
        {(event.featured || isSoldOut || event.sales_paused) && (
          <div className="absolute right-4 top-4 z-10 flex flex-wrap gap-1.5">
            {event.featured && <Badge variant="warning">Featured</Badge>}
            {event.sales_paused && <Badge variant="destructive">On hold</Badge>}
            {isSoldOut && <Badge variant="destructive">Sold out</Badge>}
          </div>
        )}

        {/* Content grid */}
        <div className="relative grid gap-6 p-5 sm:gap-6 sm:p-7 lg:grid-cols-[1fr_280px] lg:gap-8 lg:p-9 lg:min-h-[320px]">
          {/* Info */}
          <div className="order-2 flex flex-col justify-center text-white lg:order-1">
            {event.category && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/40 bg-transparent px-4 py-1.5 text-sm font-medium capitalize text-white">
                <Tag className="h-3 w-3" />
                {event.category}
              </span>
            )}
            <h1 className="mt-5 text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>
            <div className="mt-7 space-y-3">
              {dateObj && (
                <p className="flex items-center gap-2.5 text-base font-medium text-white/90 sm:text-lg">
                  <CalendarPlus className="h-5 w-5 shrink-0 text-white/70" />
                  {dateObj.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  <span className="text-white/50">·</span>
                  {formatTimeRange(dateObj, endObj)}
                </p>
              )}
              {venue && (
                <div className="flex items-center gap-2.5 text-base text-white/80 sm:text-lg">
                  <MapPin className="h-5 w-5 shrink-0 text-white/70" />
                  <span>{venue}</span>
                  {event.venue_location_url && (
                    <a
                      href={event.venue_location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/90 hover:bg-white/20 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Get directions
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Poster */}
          <div className="order-1 relative aspect-3/4 w-full max-w-[300px] mx-auto overflow-hidden rounded-2xl bg-black/30 shadow-2xl ring-1 ring-white/10 lg:order-2 lg:mx-0 lg:max-w-none">
            {event.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.banner_url}
                alt={event.title}
                className="h-full w-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                <ImageIcon className="h-20 w-20" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {/* About */}
          <section>
            <SectionHeading icon={Info}>About this event</SectionHeading>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {event.description || "No description provided."}
            </p>
          </section>

          {/* Venue location */}
          {(event.venue_address || event.venue_location_url) && (
            <section>
              <SectionHeading icon={MapPin}>Venue</SectionHeading>
              <div className="mt-3 rounded-2xl border border-border bg-card p-4">
                {event.venue_name && (
                  <p className="font-semibold text-foreground">{event.venue_name}</p>
                )}
                {event.venue_address && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{event.venue_address}</p>
                )}
                {event.venue_location_url && (
                  <a
                    href={event.venue_location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <MapPin className="h-4 w-4 text-primary" />
                    Get directions
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Ticket prices (read-only — selection happens at checkout) */}
          {hasTicketTypes && (() => {
            const isZoned = event.seating_mode === "zoned"
            const isFree = event.seating_mode === "free"
            const sectionTitle = isZoned ? "Zone Prices" : "Ticket Prices"
            const unitLabel = (n: number) =>
              isZoned ? (n === 1 ? "zone" : "zones") : (n === 1 ? "tier" : "tiers")
            const footerText = isFree
              ? "Open seating — pick a seat on arrival, first come, first served."
              : isZoned
                ? "Pick your zone and quantity at checkout."
                : "Pick your tier and quantity at checkout."

            return (
              <section className="rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold text-foreground">{sectionTitle}</h2>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {event.ticket_types!.length} {unitLabel(event.ticket_types!.length)}
                  </span>
                </div>

                <ul className="divide-y divide-border">
                  {event.ticket_types!.map((tt) => (
                    <TicketPriceRow key={tt.id} ticket={tt} />
                  ))}
                </ul>

                <div className="border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
                  {footerText}
                </div>
              </section>
            )
          })()}

          {/* Organizer card — sources ONLY from organizer_profiles
              (business_name, profile_image_url, business_type). We deliberately
              do NOT fall back to the user's personal name / Google avatar:
              attendees see the brand, not the person behind it. Resigned /
              revoked organizers flip to "Former organizer" with no badge. */}
          {event.organizer && (() => {
            const o = event.organizer
            const brandName = o.business_name?.trim() || "Organizer"
            const initial = brandName.charAt(0).toUpperCase()
            const avatarSrc = o.profile_image_url || null
            const roleLabel = o.deactivated ? "Former organizer" : "Organizer"

            return (
              <section>
                <SectionHeading icon={User}>Organized by</SectionHeading>
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <span
                    className={cn(
                      "inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-primary/10 font-semibold text-primary",
                      o.deactivated && "grayscale",
                    )}
                  >
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt={brandName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg">
                        {initial}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-foreground">{brandName}</span>
                      {o.verified && (
                        // Custom verified badge (blue rosette + tick). File
                        // name has a space → URL-encode it. Next.js serves
                        // /public/* at the root, so /Images/... is correct.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/Images/verified%20badge.png"
                          alt="Verified organizer"
                          width={16}
                          height={16}
                          className="h-4 w-4 shrink-0"
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{roleLabel}</div>
                  </div>
                </div>
              </section>
            )
          })()}
        </div>

        {/* Sticky ticket sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            {/* Countdown to event */}
            {dateObj && dateObj.getTime() > Date.now() && (
              <CountdownCard target={dateObj} />
            )}

            {/* Price + CTA. Suppressed when sales are paused — minTierPrice
                would be 0 (active tiers were filtered out server-side), and
                rendering "Free" against a paused event misleads the buyer. */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              {event.sales_paused ? (
                <div className="mb-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </div>
                  <div className="mt-1 text-2xl font-bold text-destructive">
                    On hold
                  </div>
                </div>
              ) : (
                <div className="mb-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {hasMultipleTiers ? "Starting from" : "Price"}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {formatLkr(minTierPrice ?? 0)}
                    </span>
                    {hasMultipleTiers && maxTierPrice !== minTierPrice && (
                      <span className="text-xs text-muted-foreground">
                        up to {formatLkr(maxTierPrice)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="space-y-2">
                {isRegistered ? (
                  <>
                    <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>You&rsquo;re registered for this event.</span>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleUnregister} disabled={busy}>
                      {busy ? "Working…" : "Unregister"}
                    </Button>
                  </>
                ) : event.sales_paused ? (
                  // Organizer hit "Pause sales" — tickets exist but every
                  // tier is inactive. Show a clear hold state instead of
                  // falling through to Buy (which would 409 at checkout) or
                  // to Register-Free (which would misrepresent the event).
                  <div className="space-y-2">
                    {/* Solid red + white text override. The shared
                        `destructive` variant is a muted tone (red text on
                        translucent red bg); we want a hard "stop" signal
                        here. disabled:opacity-100 keeps it vivid when disabled. */}
                    <Button
                      className="w-full bg-destructive text-white hover:bg-destructive/90 disabled:opacity-100"
                      size="lg"
                      disabled
                    >
                      <Ticket /> Event on hold
                    </Button>
                    <p className="text-center text-xs text-destructive">
                      The organizer has temporarily paused ticket sales. Check back soon.
                    </p>
                  </div>
                ) : hasTicketTypes ? (
                  isSoldOut ? (
                    <WaitlistJoin eventId={params.id as string} defaultEmail={user?.email ?? ""} defaultName={user?.name ?? ""} />
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleContinueToCheckout}
                    >
                      <Ticket /> Buy Tickets
                    </Button>
                  )
                ) : isSoldOut ? (
                  <WaitlistJoin eventId={params.id as string} defaultEmail={user?.email ?? ""} defaultName={user?.name ?? ""} />
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleRegister}
                    disabled={busy}
                  >
                    <Ticket /> {busy ? "Processing…" : "Register (Free RSVP)"}
                  </Button>
                )}
              </div>

              {/* Reassurance */}
              <div className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Secure checkout · Instant e-ticket · QR-coded entry</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      {children}
    </h2>
  )
}

function CountdownCard({ target }: { target: Date }) {
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = Math.max(0, target.getTime() - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Event starts in
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <CountdownUnit value={days} label="Days" />
        <CountdownUnit value={hours} label="Hrs" />
        <CountdownUnit value={minutes} label="Min" />
        <CountdownUnit value={seconds} label="Sec" />
      </div>
    </div>
  )
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-background py-2.5">
      <span className="text-2xl font-bold tabular-nums text-foreground">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function TicketPriceRow({ ticket }: { ticket: TicketType }) {
  const remaining = ticketRemaining(ticket)
  const status = ticketStatus(ticket)
  const lowStock = status === "available" && remaining <= 10
  const price = Number(ticket.price)

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{ticket.name}</span>
            {status === "soldout" && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                Sold out
              </span>
            )}
            {status === "ended" && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                Sales ended
              </span>
            )}
            {status === "not_started" && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Opens {new Date(ticket.sale_start!).toLocaleDateString()}
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
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">LKR</div>
          <div className="text-xl font-bold leading-tight text-foreground">
            {price === 0
              ? "Free"
              : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </li>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mb-10 h-[420px] w-full animate-pulse rounded-3xl bg-muted" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-60 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="space-y-4 lg:col-span-1">
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  )
}

// Sold-out events show a small inline form to capture interested buyers.
// Works for guests too (email is the only required field). Persists "joined"
// state in localStorage so a return visitor sees the confirmation instead of
// the form (server is also the source of truth — POSTing again just upserts).
function WaitlistJoin({
  eventId,
  defaultEmail,
  defaultName,
}: {
  eventId: string
  defaultEmail: string
  defaultName: string
}) {
  const STORAGE_KEY = `waitlist:${eventId}`
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState(defaultEmail)
  const [name, setName] = React.useState(defaultName)
  const [submitting, setSubmitting] = React.useState(false)
  const [joined, setJoined] = React.useState<string | null>(null) // joined email
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setJoined(saved)
    } catch { /* localStorage unavailable */ }
  }, [STORAGE_KEY])

  React.useEffect(() => { if (defaultEmail) setEmail(defaultEmail) }, [defaultEmail])
  React.useEffect(() => { if (defaultName)  setName(defaultName) },  [defaultName])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email.trim()) {
      setError("Email is required.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/waitlist`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.message || "Couldn't join the waitlist.")
        return
      }
      setJoined(email.trim())
      try { window.localStorage.setItem(STORAGE_KEY, email.trim()) } catch { /* noop */ }
    } catch {
      setError("Network error. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (joined) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">You&rsquo;re on the waitlist.</p>
            <p className="mt-0.5 text-xs opacity-80">
              We&rsquo;ll email <span className="font-mono">{joined}</span> if seats open up.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full" size="lg" disabled>
        <Ticket /> Sold out
      </Button>
      {!open ? (
        <Button variant="ghost" className="w-full" onClick={() => setOpen(true)}>
          <Bell /> Notify me if seats open up
        </Button>
      ) : (
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">
            Drop your email and we&rsquo;ll let you know if anyone cancels.
          </div>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            autoComplete="name"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="w-full" disabled={submitting}>
            {submitting ? <Loader className="animate-spin" /> : <Bell />}
            {submitting ? "Joining…" : "Join waitlist"}
          </Button>
        </form>
      )}
    </div>
  )
}
