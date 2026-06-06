"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Armchair,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  LayoutGrid,
  Loader,
  MapPin,
  MessageSquare,
  Plus,
  Sparkles,
  Tag,
  Ticket as TicketIcon,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContactCollaborate } from "@/components/organizer/contact-collaborate"
import { cn } from "@/lib/utils"
import { SeatGridPreview, type LayoutData } from "@/components/events/seat-grid-preview"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeatingMode = "none" | "free" | "zoned" | "reserved"

interface DetailsForm {
  title: string
  category: string
  description: string
  start_time: string
  end_time: string
  venue_name: string
  venue_address: string
  venue_location_url: string
  capacity: string
  seating_mode: SeatingMode
  sms_reminders: boolean
}

const SEATING_MODES: Array<{
  value: SeatingMode
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    value: "none",
    label: "No seating",
    description: "Tickets only — no seat assignment. Best for festivals, workshops, online events.",
    icon: TicketIcon,
  },
  {
    value: "free",
    label: "Free seating",
    description: "Venue has seats but attendees pick on arrival. Best for open conferences, small halls.",
    icon: Armchair,
  },
  {
    value: "zoned",
    label: "Zoned seating",
    description: "Different sections with separate prices (VIP, GA, Balcony). No exact seat selection.",
    icon: LayoutGrid,
  },
  {
    value: "reserved",
    label: "Reserved seating",
    description: "Attendees pick their exact seat from a venue map at checkout.",
    icon: MapPin,
  },
]

interface TicketTypeForm {
  name: string
  description: string
  price: string
  quantity_total: string
  per_order_limit: string
}

interface MediaForm {
  banner_url: string
  layout_image_url: string
  // Optional YouTube link — rendered as an embedded, playable iframe on the
  // public event detail page when present.
  trailer_url: string
}

type Step = number
const STEPS_DEFAULT = ["Details", "Tickets", "Media", "Review"] as const
const STEPS_RESERVED = ["Details", "Tickets", "Seats", "Media", "Review"] as const

// Reserved-mode wizard inserts a Seats step between Tickets and Media,
// so all step indices after Tickets shift by 1. These helpers keep the rest
// of the code readable instead of magic-numbering.
const stepsForMode = (mode: SeatingMode): readonly string[] =>
  mode === "reserved" ? STEPS_RESERVED : STEPS_DEFAULT

// A grid the organizer builds in the wizard. Held in state and applied straight
// to the event after it's created (no reusable venue_layout is ever saved).
interface BuiltLayout {
  layout_data: LayoutData
  stage_position: string
  total_seats: number
}

// A custom venue document the organizer uploads for the admin team to build the
// seat map from (image or PDF).
interface LayoutDocument {
  url: string
  name: string
  type: string
}

// section name -> index into the tickets[] array. Resolved to UUIDs at submit
// time by matching tickets[index].name against the API's returned ticket_types.
type SectionTicketMap = Record<string, number>

const emptyDetails: DetailsForm = {
  title: "",
  category: "",
  description: "",
  start_time: "",
  end_time: "",
  venue_name: "",
  venue_address: "",
  venue_location_url: "",
  capacity: "",
  seating_mode: "none",
  sms_reminders: true,
}

const emptyTicket = (): TicketTypeForm => ({
  name: "",
  description: "",
  price: "",
  quantity_total: "",
  per_order_limit: "10",
})

const emptyMedia: MediaForm = { banner_url: "", layout_image_url: "", trailer_url: "" }

const localToIso = (v: string): string | null => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const buildPayload = (
  details: DetailsForm,
  tickets: TicketTypeForm[],
  media: MediaForm,
) => ({
  title: details.title.trim(),
  description: details.description.trim() || null,
  category: details.category.trim() || null,
  venue_name: details.venue_name.trim() || null,
  venue_address: details.venue_address.trim() || null,
  venue_location_url: details.venue_location_url.trim() || null,
  start_time: localToIso(details.start_time),
  end_time: localToIso(details.end_time),
  capacity: details.capacity ? parseInt(details.capacity, 10) : null,
  seating_mode: details.seating_mode,
  sms_reminders: details.sms_reminders,
  banner_url: media.banner_url.trim() || null,
  layout_image_url: media.layout_image_url.trim() || null,
  trailer_url: media.trailer_url.trim() || null,
  ticket_types: tickets.map((t) => ({
    name: t.name.trim(),
    description: t.description.trim() || null,
    price: t.price === "" ? 0 : Number(t.price),
    quantity_total: t.quantity_total === "" ? 0 : parseInt(t.quantity_total, 10),
    per_order_limit: t.per_order_limit === "" ? 10 : parseInt(t.per_order_limit, 10),
  })),
})

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreateEventPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [step, setStep] = React.useState<Step>(0)
  const [details, setDetails] = React.useState<DetailsForm>(emptyDetails)
  const [tickets, setTickets] = React.useState<TicketTypeForm[]>([emptyTicket()])
  const [media, setMedia] = React.useState<MediaForm>(emptyMedia)
  const [builtLayout, setBuiltLayout] = React.useState<BuiltLayout | null>(null)
  const [sectionTicketMap, setSectionTicketMap] = React.useState<SectionTicketMap>({})
  // Reserved-mode setup path + custom-layout request fields (lifted here so the
  // submit step can branch on them — see SeatsStep for the UI). Only the
  // "custom" path is exposed: organizers upload a venue document and the
  // MyScope team builds the seat map on the admin side.
  const [seatChoice, setSeatChoice] = React.useState<LayoutChoice>("custom")
  const [customNote, setCustomNote] = React.useState("")
  const [customDocuments, setCustomDocuments] = React.useState<LayoutDocument[]>([])
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState<null | "submit">(null)

  const steps = stepsForMode(details.seating_mode)
  const lastStep = steps.length - 1
  // Step indices shift in reserved mode. Use semantic names everywhere.
  const isReserved = details.seating_mode === "reserved"
  const stepIdx = {
    details: 0,
    tickets: 1,
    seats: isReserved ? 2 : -1,
    media: isReserved ? 3 : 2,
    review: isReserved ? 4 : 3,
  }

  // Switching out of reserved mode after picking a layout: clear stale state
  // so the user doesn't accidentally submit a reserved-only payload.
  React.useEffect(() => {
    if (!isReserved && (builtLayout || Object.keys(sectionTicketMap).length > 0)) {
      setBuiltLayout(null)
      setSectionTicketMap({})
    }
  }, [isReserved, builtLayout, sectionTicketMap])

  // Clamp step when mode changes — switching to reserved adds a step, switching
  // away can leave us past the new end. Snap back to the current section.
  React.useEffect(() => {
    if (step > lastStep) setStep(lastStep)
  }, [lastStep, step])

  // Auth + role guard
  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?redirect=/organizer/events/create")
      return
    }
    if (!["organizer", "superadmin"].includes(user.role || "")) {
      router.push("/become-organizer")
    }
  }, [authLoading, user, router])

  const validateStep = (s: Step): string => {
    if (s === stepIdx.details) {
      if (!details.title.trim()) return "Title is required."
      if (!details.start_time) return "Start time is required."
      if (
        details.end_time &&
        localToIso(details.end_time)! < localToIso(details.start_time)!
      ) {
        return "End time must be after start time."
      }
    }
    if (s === stepIdx.tickets) {
      if (tickets.length === 0) return "Add at least one ticket type."
      const tierLabel = isReserved ? "Tier" : details.seating_mode === "zoned" ? "Zone" : "Ticket"
      for (const [i, t] of tickets.entries()) {
        if (!t.name.trim()) return `${tierLabel} #${i + 1}: name is required.`
        const price = Number(t.price)
        if (!Number.isFinite(price) || price < 0) {
          return `${tierLabel} #${i + 1}: price must be a non-negative number.`
        }
        const qty = parseInt(t.quantity_total, 10)
        if (!Number.isInteger(qty) || qty <= 0) {
          return `${tierLabel} #${i + 1}: quantity must be a positive integer.`
        }
        const limit = parseInt(t.per_order_limit, 10)
        if (!Number.isInteger(limit) || limit <= 0) {
          return `${tierLabel} #${i + 1}: per-order limit must be a positive integer.`
        }
      }
      // Reserved mode resolves the section→ticket-type map by ticket name at
      // submit time; duplicate names would silently collide. Block it early.
      if (isReserved) {
        const seen = new Set<string>()
        for (const t of tickets) {
          const n = t.name.trim()
          if (seen.has(n)) return `Duplicate ticket name "${n}" — names must be unique in reserved-seating events.`
          seen.add(n)
        }
      }
    }
    if (s === stepIdx.seats && isReserved) {
      // Custom layout: our team builds it from the organizer's uploaded
      // documents. Require at least one so there's something to work from.
      if (seatChoice === "custom") {
        if (customDocuments.length === 0) {
          return "Upload at least one layout document (image or PDF) so our team can build your seat map."
        }
        return ""
      }
      // Square/grid layout: a seat map must be built and every section mapped.
      if (!builtLayout || builtLayout.total_seats === 0) {
        return "Build your seat map — enter rows and seats for each section."
      }
      const sectionNames = builtLayout.layout_data.sections.map((sec) => sec.name)
      const unmapped = sectionNames.filter((n) => sectionTicketMap[n] === undefined)
      if (unmapped.length > 0) {
        return `Assign a ticket type to section(s): ${unmapped.join(", ")}.`
      }
    }
    return ""
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError("")
    setStep(Math.min(lastStep, step + 1))
  }

  const goBack = () => {
    setError("")
    setStep(Math.max(0, step - 1))
  }

  // Single-step create: POST /api/organizer/events now lands the event
  // directly in `pending` (the legacy two-step draft → submit flow is gone).
  const persist = async () => {
    // Validate every required step regardless of where the user is.
    // Reserved mode adds Step 2 (Seats); skipped for other modes.
    const stepsToCheck: Step[] = isReserved
      ? [stepIdx.details, stepIdx.tickets, stepIdx.seats]
      : [stepIdx.details, stepIdx.tickets]
    for (const s of stepsToCheck) {
      const err = validateStep(s)
      if (err) {
        setError(err)
        setStep(s)
        return
      }
    }
    setError("")
    setBusy("submit")

    try {
      const payload: Record<string, unknown> = buildPayload(details, tickets, media)
      // Custom layout: submit the reserved event without a seat map. The backend
      // marks it pending-layout and routes it to the admin Reserved Seating
      // Events section, where the team builds the map from these documents.
      const isCustomLayout = isReserved && seatChoice === "custom"
      if (isCustomLayout) {
        payload.layout_request = {
          note: customNote.trim() || undefined,
          documents: customDocuments,
        }
      }
      const createRes = await fetch(`${API_URL}/api/organizer/events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const createData = await createRes.json()
      if (!createData?.success) {
        setError(createData?.message || "Failed to create event.")
        return
      }
      const eventId = createData.data.event.id as string

      // Square/grid layout: generate event_seats straight onto the event (no
      // saved layout). Resolve section -> ticket index into real ticket_type
      // UUIDs by matching on ticket name (unique — enforced in validateStep).
      if (isReserved && !isCustomLayout && builtLayout) {
        const createdTickets = (createData.data.ticket_types || []) as Array<{ id: string; name: string }>
        const resolvedMap: Record<string, string> = {}
        for (const [sectionName, ticketIdx] of Object.entries(sectionTicketMap)) {
          const ticketName = tickets[ticketIdx]?.name?.trim()
          const created = createdTickets.find((c) => c.name === ticketName)
          if (!created) {
            setError(`Couldn't link section "${sectionName}" to a ticket type — finish the seat map from the event's edit page.`)
            router.push("/organizer/events")
            return
          }
          resolvedMap[sectionName] = created.id
        }

        const applyRes = await fetch(
          `${API_URL}/api/organizer/events/${eventId}/seat-grid`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ layout_data: builtLayout.layout_data, section_ticket_map: resolvedMap }),
          },
        )
        const applyData = await applyRes.json()
        if (!applyData?.success) {
          // Event was created but seats failed — surface the error and bounce to
          // the events list so the organizer can finish from the edit screen.
          setError(applyData?.message || "Event saved but the seat map failed to apply. Finish it from the event's edit page.")
          router.push("/organizer/events")
          return
        }
      }

      router.push("/organizer/events")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Create event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details and submit when you&rsquo;re ready for admin review.
        </p>
      </div>

      {/* Stepper */}
      <StepIndicator current={step} steps={steps} />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
        {step === stepIdx.details && <DetailsStep value={details} onChange={setDetails} />}
        {step === stepIdx.tickets && (
          <TicketsStep
            value={tickets}
            onChange={setTickets}
            seatingMode={details.seating_mode}
          />
        )}
        {step === stepIdx.seats && isReserved && (
          <SeatsStep
            tickets={tickets}
            builtLayout={builtLayout}
            sectionTicketMap={sectionTicketMap}
            eventTitle={details.title}
            choice={seatChoice}
            onChoiceChange={setSeatChoice}
            customNote={customNote}
            onCustomNoteChange={setCustomNote}
            customDocuments={customDocuments}
            onCustomDocumentsChange={setCustomDocuments}
            onBuildLayout={(layout) => {
              setBuiltLayout(layout)
              // Drop mappings for sections that no longer exist after a rebuild.
              if (layout) {
                setSectionTicketMap((prev) => {
                  const names = new Set(layout.layout_data.sections.map((s) => s.name))
                  const next: SectionTicketMap = {}
                  for (const [k, v] of Object.entries(prev)) if (names.has(k)) next[k] = v
                  return next
                })
              } else {
                setSectionTicketMap({})
              }
            }}
            onMapSection={(sectionName, ticketIdx) =>
              setSectionTicketMap((prev) => ({ ...prev, [sectionName]: ticketIdx }))
            }
          />
        )}
        {step === stepIdx.media && <MediaStep value={media} onChange={setMedia} />}
        {step === stepIdx.review && (
          <ReviewStep
            details={details}
            tickets={tickets}
            media={media}
            builtLayout={builtLayout}
            sectionTicketMap={sectionTicketMap}
            seatChoice={seatChoice}
            customDocuments={customDocuments}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={step === 0}
        >
          <ChevronLeft /> Back
        </Button>

        {step < lastStep ? (
          <Button type="button" onClick={goNext}>
            Next <ChevronRight />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={persist}
            disabled={busy !== null}
            className="min-w-36"
          >
            {busy === "submit" ? <Loader className="animate-spin" /> : null}
            {busy === "submit" ? "Submitting…" : "Submit for review"}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, steps }: { current: Step; steps: readonly string[] }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done
                  ? "bg-emerald-500 text-emerald-950"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate text-xs font-semibold",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </div>
              <div
                className={cn(
                  "mt-1.5 h-0.5 rounded-full transition-colors",
                  done ? "bg-emerald-500" : active ? "bg-primary" : "bg-border",
                )}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  )
}

function DetailsStep({
  value,
  onChange,
}: {
  value: DetailsForm
  onChange: (v: DetailsForm) => void
}) {
  const upd = (patch: Partial<DetailsForm>) => onChange({ ...value, ...patch })
  return (
    <div className="space-y-6">
      <StepHeader icon={Sparkles} title="Event details" />

      {/* Seating mode picker — drives the wizard's ticket step and checkout flow downstream */}
      <div className="space-y-2.5">
        <div>
          <FieldLabel>Seating mode</FieldLabel>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick how attendees take seats. You can&rsquo;t change this once you&rsquo;ve added ticket types.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Seating mode"
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
        >
          {SEATING_MODES.map(({ value: mode, label, description, icon: Icon }) => {
            const selected = value.seating_mode === mode
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected ? "true" : "false"}
                onClick={() => upd({ seating_mode: mode })}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    {selected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="title" required>Title</FieldLabel>
        <Input
          id="title"
          type="text"
          value={value.title}
          onChange={(e) => upd({ title: e.target.value })}
          placeholder="Indie Music Night"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="category">Category</FieldLabel>
          <select
            id="category"
            aria-label="Event category"
            value={value.category}
            onChange={(e) => upd({ category: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <option value="">Pick one…</option>
            <option value="Concerts">Concerts</option>
            <option value="Theatre">Theatre</option>
            <option value="Sports">Sports</option>
            <option value="Events">Events</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
          <Input
            id="capacity"
            type="number"
            min={1}
            value={value.capacity}
            onChange={(e) => upd({ capacity: e.target.value })}
            placeholder="e.g. 300"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <textarea
          id="description"
          rows={5}
          value={value.description}
          onChange={(e) => upd({ description: e.target.value })}
          placeholder="What should attendees know? Lineup, doors-open time, refund policy…"
          className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="start_time" required>Start time</FieldLabel>
          <Input
            id="start_time"
            type="datetime-local"
            value={value.start_time}
            onChange={(e) => upd({ start_time: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="end_time">End time</FieldLabel>
          <Input
            id="end_time"
            type="datetime-local"
            value={value.end_time}
            onChange={(e) => upd({ end_time: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="venue_name">Venue name</FieldLabel>
        <Input
          id="venue_name"
          type="text"
          value={value.venue_name}
          onChange={(e) => upd({ venue_name: e.target.value })}
          placeholder="The Warehouse Project"
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="venue_address">Venue address</FieldLabel>
        <Input
          id="venue_address"
          type="text"
          value={value.venue_address}
          onChange={(e) => upd({ venue_address: e.target.value })}
          placeholder="123 Galle Rd, Colombo 03"
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="venue_location_url">Location URL</FieldLabel>
        <Input
          id="venue_location_url"
          type="url"
          value={value.venue_location_url}
          onChange={(e) => upd({ venue_location_url: e.target.value })}
          placeholder="https://maps.google.com/..."
        />
        <p className="text-xs text-muted-foreground">
          Paste a Google Maps link so attendees can find the venue easily.
        </p>
      </div>

      <label
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors",
          value.sms_reminders
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card hover:border-primary/40",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            value.sms_reminders ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground">SMS reminders</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            Text attendees a reminder before this event. Turn off to send email-only reminders.
          </span>
        </span>
        <input
          type="checkbox"
          checked={value.sms_reminders}
          onChange={(e) => upd({ sms_reminders: e.target.checked })}
          aria-label="SMS reminders"
          className="sr-only"
        />
        <span
          className={cn(
            "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            value.sms_reminders ? "bg-primary" : "bg-muted ring-1 ring-border",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
              value.sms_reminders ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </span>
      </label>
    </div>
  )
}

function TicketsStep({
  value,
  onChange,
  seatingMode,
}: {
  value: TicketTypeForm[]
  onChange: (v: TicketTypeForm[]) => void
  seatingMode: SeatingMode
}) {
  const updTicket = (idx: number, patch: Partial<TicketTypeForm>) => {
    const next = value.slice()
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }

  // Zoned events frame ticket types as venue zones, since each tier maps to a
  // physical section (VIP, GA, Balcony). All other modes keep generic ticket wording.
  const isZoned = seatingMode === "zoned"
  const heading = isZoned ? "Zones" : "Ticket types"
  const addLabel = isZoned ? "Add zone" : "Add ticket"
  const intro = isZoned
    ? "Each zone is a section of your venue with its own capacity and price."
    : "Each ticket type can have its own price, quantity, and sale window."
  const rowLabel = isZoned ? "Zone" : "Ticket"
  const namePlaceholder = isZoned ? "VIP, GA, Balcony…" : "General, VIP, Early Bird…"

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Tag className="h-5 w-5 text-primary" />
          {heading}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, emptyTicket()])}
        >
          <Plus /> {addLabel}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{intro}</p>

      <div className="space-y-3">
        {value.map((t, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-background/40 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {rowLabel} #{idx + 1}
              </span>
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                  aria-label={`Remove ${rowLabel.toLowerCase()}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel required>Name</FieldLabel>
                <Input
                  type="text"
                  value={t.name}
                  onChange={(e) => updTicket(idx, { name: e.target.value })}
                  placeholder={namePlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel required>Price (LKR)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={t.price}
                  onChange={(e) => updTicket(idx, { price: e.target.value })}
                  placeholder="2500"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel required>Total quantity</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={t.quantity_total}
                  onChange={(e) => updTicket(idx, { quantity_total: e.target.value })}
                  placeholder="250"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Per-order limit</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={t.per_order_limit}
                  onChange={(e) => updTicket(idx, { per_order_limit: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <FieldLabel>Description (optional)</FieldLabel>
                <Input
                  type="text"
                  value={t.description}
                  onChange={(e) => updTicket(idx, { description: e.target.value })}
                  placeholder="What's included with this ticket?"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SeatsStep — reserved-mode wizard step. Two paths only:
//   • "grid"   — build a square/grid seat map here; it's applied straight to the
//                event on submit (no reusable layout is ever saved).
//   • "custom" — upload venue documents (images/PDFs); the MyScope team builds
//                the seat map from the admin side, then approves the event.
// ---------------------------------------------------------------------------
type LayoutChoice = "grid" | "custom"

// Max custom-layout documents an organizer can attach (kept in sync with the API).
const LAYOUT_DOC_MAX = 10

function SeatsStep({
  tickets,
  builtLayout,
  sectionTicketMap,
  eventTitle,
  choice,
  onChoiceChange,
  customNote,
  onCustomNoteChange,
  customDocuments,
  onCustomDocumentsChange,
  onBuildLayout,
  onMapSection,
}: {
  tickets: TicketTypeForm[]
  builtLayout: BuiltLayout | null
  sectionTicketMap: SectionTicketMap
  eventTitle?: string
  choice: LayoutChoice
  onChoiceChange: (c: LayoutChoice) => void
  customNote: string
  onCustomNoteChange: (v: string) => void
  customDocuments: LayoutDocument[]
  onCustomDocumentsChange: (docs: LayoutDocument[]) => void
  onBuildLayout: (layout: BuiltLayout | null) => void
  onMapSection: (sectionName: string, ticketIdx: number) => void
}) {
  const [uploadError, setUploadError] = React.useState("")
  const [uploading, setUploading] = React.useState(false)

  // Upload one-or-more custom-layout documents (images / PDFs) and append the
  // returned references to the list. Reuses /upload-layout-doc once per file.
  const handleDocUpload = async (files: FileList) => {
    setUploadError("")
    const room = LAYOUT_DOC_MAX - customDocuments.length
    if (room <= 0) {
      setUploadError(`You can attach up to ${LAYOUT_DOC_MAX} documents.`)
      return
    }
    const picked = Array.from(files).slice(0, room)
    setUploading(true)
    const added: LayoutDocument[] = []
    try {
      for (const file of picked) {
        const isImg = file.type.startsWith("image/")
        const isPdf = file.type === "application/pdf"
        if (!isImg && !isPdf) { setUploadError("Only images and PDF files are allowed."); continue }
        if (file.size > 15 * 1024 * 1024) { setUploadError(`"${file.name}" is over 15 MB.`); continue }
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch(`${API_URL}/api/organizer/events/upload-layout-doc`, {
          method: "POST",
          credentials: "include",
          body: fd,
        })
        const data = await res.json()
        if (!data?.success) { setUploadError(data?.message || `Upload failed for "${file.name}".`); continue }
        added.push(data.data as LayoutDocument)
      }
      if (added.length) onCustomDocumentsChange([...customDocuments, ...added])
    } catch {
      setUploadError("Network error uploading documents.")
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = (url: string) =>
    onCustomDocumentsChange(customDocuments.filter((d) => d.url !== url))

  return (
    <div className="space-y-5">
      <StepHeader icon={Sparkles} title="Seats" />
      <p className="text-sm text-muted-foreground">
        Reserved seating lets attendees pick their exact seat. Upload your venue layout
        and our team builds the seat map for you.
      </p>

      {/* CUSTOM — upload documents; the admin team builds the seat map */}
      {choice === "custom" && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Upload your venue layout</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Outdoor concerts, multi-level halls, curved seating — upload images or a PDF of your
                seating plan. Our team builds the exact seat map and you&rsquo;ll see it on this
                event&rsquo;s edit page. The event goes on sale once the seat map is ready and approved.
              </p>
            </div>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Uploaded documents */}
          {customDocuments.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {customDocuments.map((doc) => (
                <li key={doc.url} className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
                  {doc.type === "application/pdf" ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-32 flex-col items-center justify-center gap-1.5 p-2 text-center"
                    >
                      <FileText className="h-7 w-7 text-primary" />
                      <span className="line-clamp-2 text-[11px] text-muted-foreground">{doc.name}</span>
                    </a>
                  ) : (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doc.url} alt={doc.name} className="h-32 w-full object-cover" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => removeDoc(doc.url)}
                    className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-1 text-[11px] font-medium text-foreground shadow hover:bg-background"
                    aria-label={`Remove ${doc.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Upload tile */}
          {customDocuments.length < LAYOUT_DOC_MAX && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/40">
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleDocUpload(e.target.files)
                  e.target.value = ""
                }}
              />
              {uploading ? (
                <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="mt-1.5 text-sm font-medium text-foreground">
                {uploading ? "Uploading…" : "Upload images or PDF"}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                PNG / JPG / PDF, up to 15 MB each · {customDocuments.length}/{LAYOUT_DOC_MAX}
              </span>
            </label>
          )}

          {/* Note */}
          <div>
            <label htmlFor="layout-note" className="mb-1.5 block text-sm font-medium text-foreground">
              Notes for our team (optional)
            </label>
            <textarea
              id="layout-note"
              value={customNote}
              onChange={(e) => onCustomNoteChange(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Describe the seating — sections, approximate rows/seats, any tiers, accessible areas…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            />
          </div>

          <ContactCollaborate
            variant="small"
            eventTitle={eventTitle}
            subtitle="Prefer to chat it through? Message us on WhatsApp."
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SimpleLayoutBuilder — section-based square/grid generator with a live preview.
// Builds layout_data in component state and pushes it up via onBuild; it does
// NOT persist a reusable venue_layout (the wizard applies it straight to the
// event after creation).
// ---------------------------------------------------------------------------

interface BuilderSection {
  name: string
  color: string
  rows: string
  seatsPerRow: string
  rowStart: string
}

const BUILDER_COLORS = ["#7F77DD", "#1D9E75", "#BA7517", "#D85A30", "#185FA5", "#993556"]

const emptyBuilderSection = (idx: number): BuilderSection => ({
  name: idx === 0 ? "Main Hall" : `Section ${idx + 1}`,
  color: BUILDER_COLORS[idx % BUILDER_COLORS.length],
  rows: "8",
  seatsPerRow: "20",
  rowStart: "A",
})

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function SimpleLayoutBuilder({
  onBuild,
}: {
  onBuild: (layout: BuiltLayout | null) => void
}) {
  const [stagePosition, setStagePosition] = React.useState("front")
  const [sections, setSections] = React.useState<BuilderSection[]>([emptyBuilderSection(0)])
  const [buildError, setBuildError] = React.useState("")

  const updSection = (i: number, patch: Partial<BuilderSection>) => {
    setSections((prev) => {
      const next = prev.slice()
      next[i] = { ...next[i], ...patch }
      return next
    })
  }

  const totalSeats = sections.reduce((acc, s) => {
    const rows = parseInt(s.rows, 10) || 0
    const seats = parseInt(s.seatsPerRow, 10) || 0
    return acc + rows * seats
  }, 0)

  // Best-effort geometry for the live preview — clamps to sane bounds so it
  // updates on every keystroke without throwing.
  const previewData: LayoutData = React.useMemo(() => ({
    sections: sections.map((s, i) => {
      const rowCount = Math.max(0, Math.min(26, parseInt(s.rows, 10) || 0))
      const seatsPerRow = Math.max(0, Math.min(100, parseInt(s.seatsPerRow, 10) || 0))
      const startCh = (s.rowStart || "A").trim().toUpperCase().charAt(0)
      const startIdx = Math.max(0, ALPHA.indexOf(/[A-Z]/.test(startCh) ? startCh : "A"))
      return {
        id: `s${i + 1}`,
        name: s.name.trim() || `Section ${i + 1}`,
        color: s.color,
        rows: Array.from({ length: rowCount }, (_, r) => ({
          label: ALPHA[Math.min(25, startIdx + r)],
          seats: Array.from({ length: seatsPerRow }, (_, j) => ({ number: String(j + 1), type: "standard" })),
        })),
      }
    }),
  }), [sections])

  // Validate + build the layout_data JSON the API expects, or return an error.
  const buildLayoutData = React.useCallback((): LayoutData | { error: string } => {
    const out: LayoutData = { sections: [] }
    const usedNames = new Set<string>()
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]
      const sectionName = s.name.trim()
      if (!sectionName) return { error: `Section #${i + 1}: name is required.` }
      if (usedNames.has(sectionName)) return { error: `Duplicate section name "${sectionName}".` }
      usedNames.add(sectionName)

      const rowCount = parseInt(s.rows, 10)
      const seatsPerRow = parseInt(s.seatsPerRow, 10)
      if (!Number.isInteger(rowCount) || rowCount <= 0) {
        return { error: `Section "${sectionName}": rows must be a positive integer.` }
      }
      if (!Number.isInteger(seatsPerRow) || seatsPerRow <= 0) {
        return { error: `Section "${sectionName}": seats per row must be a positive integer.` }
      }
      const startChar = (s.rowStart || "A").trim().toUpperCase().charAt(0)
      const startIdx = ALPHA.indexOf(startChar)
      if (startIdx < 0) {
        return { error: `Section "${sectionName}": start row must be a single letter A–Z.` }
      }
      if (startIdx + rowCount > 26) {
        return { error: `Section "${sectionName}": rows would extend past Z. Reduce or split.` }
      }

      out.sections.push({
        id: `s${i + 1}`,
        name: sectionName,
        color: s.color,
        rows: Array.from({ length: rowCount }, (_, r) => ({
          label: ALPHA[startIdx + r],
          seats: Array.from({ length: seatsPerRow }, (_, j) => ({
            number: String(j + 1),
            type: "standard",
          })),
        })),
      })
    }
    return out
  }, [sections])

  // Push the built layout up whenever geometry or stage change. A ref keeps the
  // parent callback out of the dependency array so we don't re-emit (and loop)
  // on every parent re-render.
  const onBuildRef = React.useRef(onBuild)
  React.useEffect(() => { onBuildRef.current = onBuild })
  React.useEffect(() => {
    const data = buildLayoutData()
    if ("error" in data) {
      setBuildError(totalSeats > 0 ? data.error : "")
      onBuildRef.current(null)
      return
    }
    setBuildError("")
    const total = data.sections.reduce(
      (acc, sec) => acc + sec.rows.reduce((r, row) => r + row.seats.length, 0),
      0,
    )
    onBuildRef.current({ layout_data: data, stage_position: stagePosition, total_seats: total })
  }, [buildLayoutData, stagePosition, totalSeats])

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="stage-pos">Stage</FieldLabel>
          <select
            id="stage-pos"
            aria-label="Stage position"
            value={stagePosition}
            onChange={(e) => setStagePosition(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <option value="front">Front</option>
            <option value="back">Back</option>
            <option value="centre">Centre</option>
            <option value="traverse">Traverse</option>
            <option value="none">No stage</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Section #{i + 1}
              </span>
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSections((prev) => prev.filter((_, idx) => idx !== i))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                  aria-label="Remove section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel required>Section name</FieldLabel>
                <Input
                  type="text"
                  value={s.name}
                  onChange={(e) => updSection(i, { name: e.target.value })}
                  placeholder="VIP, Main Floor, Balcony…"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Colour</FieldLabel>
                <div className="flex items-center gap-1.5">
                  {BUILDER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Pick colour ${c}`}
                      onClick={() => updSection(i, { color: c })}
                      className={cn(
                        "h-7 w-7 rounded-md border-2 transition-transform",
                        s.color === c ? "scale-110 border-foreground" : "border-transparent",
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel required>Rows</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={26}
                  value={s.rows}
                  onChange={(e) => updSection(i, { rows: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel required>Seats per row</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={s.seatsPerRow}
                  onChange={(e) => updSection(i, { seatsPerRow: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Start row letter</FieldLabel>
                <Input
                  type="text"
                  maxLength={1}
                  value={s.rowStart}
                  onChange={(e) => updSection(i, { rowStart: e.target.value.toUpperCase() })}
                  placeholder="A"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {buildError && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{buildError}</span>
        </div>
      )}

      {/* Live preview — redraws as you edit rows / seats / sections / stage */}
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <div className="mb-2 flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live preview
          </span>
        </div>
        {totalSeats > 0 ? (
          <SeatGridPreview layout={previewData} stagePosition={stagePosition} />
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Enter rows and seats to see your seat map.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          ≈ {totalSeats.toLocaleString()} bookable seats
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSections((prev) => [...prev, emptyBuilderSection(prev.length)])}
        >
          <Plus /> Add section
        </Button>
      </div>
    </div>
  )
}

function MediaStep({
  value,
  onChange,
}: {
  value: MediaForm
  onChange: (v: MediaForm) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={ImageIcon}
        title="Media"
        subtitle="Upload a banner image, and optionally a seating/zone layout map."
      />

      <div className="space-y-2.5">
        <FieldLabel>Banner image</FieldLabel>
        <ImageDropzone
          value={value.banner_url}
          onChange={(url) => onChange({ ...value, banner_url: url })}
          previewAlt="Banner preview"
        />
      </div>

      <div className="space-y-2.5">
        <FieldLabel>Seating / zone layout (optional)</FieldLabel>
        <p className="-mt-1 text-xs text-muted-foreground">
          A venue map showing zones or the seat plan. Shown to attendees on the ticket-selection page.
        </p>
        <ImageDropzone
          value={value.layout_image_url}
          onChange={(url) => onChange({ ...value, layout_image_url: url })}
          previewAlt="Layout preview"
        />
      </div>

      <div className="space-y-2.5">
        <FieldLabel>YouTube trailer (optional)</FieldLabel>
        <p className="-mt-1 text-xs text-muted-foreground">
          Paste a YouTube link — watch URL, youtu.be short link, or Shorts.
          Attendees will see it as a playable video on your event page.
        </p>
        <Input
          type="url"
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={value.trailer_url}
          onChange={(e) => onChange({ ...value, trailer_url: e.target.value })}
        />
      </div>
    </div>
  )
}

// Reusable image upload + preview tile. Posts to the shared upload-banner
// endpoint (a generic image uploader) and hands back the public URL.
function ImageDropzone({
  value,
  onChange,
  previewAlt,
}: {
  value: string
  onChange: (url: string) => void
  previewAlt: string
}) {
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (PNG, JPG, WebP…).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.")
      return
    }
    setUploadError("")
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch(`${API_URL}/api/organizer/events/upload-banner`, {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.message || "Upload failed.")
      onChange(data.data.url)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      {/* Drop zone — a <label> wrapping a hidden file input keeps a single
          interactive control while remaining keyboard- and click-accessible. */}
      <label
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          uploading
            ? "border-primary/60"
            : "border-border hover:border-primary/40 hover:bg-muted/40",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          title="Upload image"
          aria-label="Upload image"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Loader className="h-7 w-7 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Uploading…</span>
          </>
        ) : (
          <>
            <ImageIcon className="h-10 w-10 text-primary/40" />
            <span className="text-sm font-semibold text-primary">Click to upload image</span>
            <span className="text-xs text-muted-foreground">PNG, JPG, WebP · max 5 MB</span>
          </>
        )}
      </label>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {value && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={previewAlt}
            className="w-full rounded-xl border border-border bg-muted object-contain"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs font-medium text-destructive hover:underline"
          >
            Remove image
          </button>
        </div>
      )}
    </div>
  )
}

function ReviewStep({
  details,
  tickets,
  media,
  builtLayout,
  sectionTicketMap,
  seatChoice,
  customDocuments,
}: {
  details: DetailsForm
  tickets: TicketTypeForm[]
  media: MediaForm
  builtLayout: BuiltLayout | null
  sectionTicketMap: SectionTicketMap
  seatChoice: LayoutChoice
  customDocuments: LayoutDocument[]
}) {
  const totalSeats = tickets.reduce(
    (sum, t) => sum + (parseInt(t.quantity_total, 10) || 0),
    0,
  )

  const isZoned = details.seating_mode === "zoned"
  const isReserved = details.seating_mode === "reserved"
  const rowLabel = isZoned ? "Zone" : "Ticket"

  return (
    <div className="space-y-5">
      <StepHeader icon={Check} title="Review" />

      <ReviewBlock title="Event">
        <Row label="Title" value={details.title || "—"} />
        <Row label="Category" value={details.category || "—"} />
        <Row
          label="Seating"
          value={SEATING_MODES.find((m) => m.value === details.seating_mode)?.label || "—"}
        />
        <Row label="Starts" value={details.start_time || "—"} />
        <Row label="Ends" value={details.end_time || "—"} />
        <Row label="Venue" value={details.venue_name || "—"} />
        <Row label="Address" value={details.venue_address || "—"} />
        <Row label="Location URL" value={details.venue_location_url || "—"} />
        <Row label="Capacity" value={details.capacity || "—"} />
      </ReviewBlock>

      <ReviewBlock
        title={
          isZoned
            ? `Zones (${tickets.length}) · ${totalSeats} total seats`
            : `Ticket types (${tickets.length}) · ${totalSeats} total seats`
        }
      >
        {tickets.map((t, i) => (
          <div key={i} className="py-1.5 text-sm">
            <span className="font-semibold text-foreground">
              {t.name || `${rowLabel} #${i + 1}`}
            </span>
            <span className="text-muted-foreground">
              {" · "}LKR {t.price || "0"} · {t.quantity_total || "0"} seats · max{" "}
              {t.per_order_limit || "10"}/order
            </span>
          </div>
        ))}
      </ReviewBlock>

      {isReserved && seatChoice === "grid" && builtLayout && (
        <ReviewBlock
          title={`Venue layout — square/grid · ${builtLayout.total_seats} seats`}
        >
          {builtLayout.layout_data.sections.map((section) => {
            const ticketIdx = sectionTicketMap[section.name]
            const ticketName =
              ticketIdx !== undefined ? tickets[ticketIdx]?.name?.trim() : null
            return (
              <div
                key={section.id}
                className="flex items-center gap-2 py-1.5 text-sm"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded"
                  style={{ background: section.color || "var(--muted)" }}
                  aria-hidden
                />
                <span className="font-semibold text-foreground">{section.name}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {ticketName || (
                    <span className="text-destructive">no ticket assigned</span>
                  )}
                </span>
              </div>
            )
          })}
        </ReviewBlock>
      )}

      {isReserved && seatChoice === "custom" && (
        <ReviewBlock title={`Venue layout — custom (${customDocuments.length} document${customDocuments.length === 1 ? "" : "s"})`}>
          <p className="py-1.5 text-sm text-muted-foreground">
            Our team will build the seat map from your uploaded documents. The event is created now and
            goes on sale once the seat map is ready and approved.
          </p>
        </ReviewBlock>
      )}

      <ReviewBlock title="Media">
        {media.banner_url || media.layout_image_url ? (
          <div className="flex flex-wrap gap-3">
            {media.banner_url && (
              <div className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={media.banner_url}
                  alt="Banner preview"
                  className="h-28 w-auto rounded-lg border border-border object-contain bg-muted"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
                <div className="text-[11px] text-muted-foreground">Banner</div>
              </div>
            )}
            {media.layout_image_url && (
              <div className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={media.layout_image_url}
                  alt="Layout preview"
                  className="h-28 w-auto rounded-lg border border-border object-contain bg-muted"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
                <div className="text-[11px] text-muted-foreground">Seating / zone layout</div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No image uploaded</span>
        )}
      </ReviewBlock>
    </div>
  )
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-foreground">{value}</span>
    </div>
  )
}

