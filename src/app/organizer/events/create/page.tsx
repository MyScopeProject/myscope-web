"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader,
  Plus,
  Save,
  Send,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetailsForm {
  title: string
  category: string
  description: string
  start_time: string
  end_time: string
  venue_name: string
  venue_address: string
  capacity: string
}

interface TicketTypeForm {
  name: string
  description: string
  price: string
  quantity_total: string
  per_order_limit: string
  sale_start: string
  sale_end: string
}

interface MediaForm {
  banner_url: string
}

type Step = 0 | 1 | 2 | 3
const STEPS = ["Details", "Tickets", "Media", "Review"] as const

const emptyDetails: DetailsForm = {
  title: "",
  category: "",
  description: "",
  start_time: "",
  end_time: "",
  venue_name: "",
  venue_address: "",
  capacity: "",
}

const emptyTicket = (): TicketTypeForm => ({
  name: "",
  description: "",
  price: "",
  quantity_total: "",
  per_order_limit: "10",
  sale_start: "",
  sale_end: "",
})

const emptyMedia: MediaForm = { banner_url: "" }

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
  start_time: localToIso(details.start_time),
  end_time: localToIso(details.end_time),
  capacity: details.capacity ? parseInt(details.capacity, 10) : null,
  banner_url: media.banner_url.trim() || null,
  ticket_types: tickets.map((t) => ({
    name: t.name.trim(),
    description: t.description.trim() || null,
    price: t.price === "" ? 0 : Number(t.price),
    quantity_total: t.quantity_total === "" ? 0 : parseInt(t.quantity_total, 10),
    per_order_limit: t.per_order_limit === "" ? 10 : parseInt(t.per_order_limit, 10),
    sale_start: localToIso(t.sale_start),
    sale_end: localToIso(t.sale_end),
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
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState<null | "draft" | "submit">(null)

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
    if (s === 0) {
      if (!details.title.trim()) return "Title is required."
      if (!details.start_time) return "Start time is required."
      if (
        details.end_time &&
        localToIso(details.end_time)! < localToIso(details.start_time)!
      ) {
        return "End time must be after start time."
      }
    }
    if (s === 1) {
      if (tickets.length === 0) return "Add at least one ticket type."
      for (const [i, t] of tickets.entries()) {
        if (!t.name.trim()) return `Ticket #${i + 1}: name is required.`
        const price = Number(t.price)
        if (!Number.isFinite(price) || price < 0) {
          return `Ticket #${i + 1}: price must be a non-negative number.`
        }
        const qty = parseInt(t.quantity_total, 10)
        if (!Number.isInteger(qty) || qty <= 0) {
          return `Ticket #${i + 1}: quantity must be a positive integer.`
        }
        const limit = parseInt(t.per_order_limit, 10)
        if (!Number.isInteger(limit) || limit <= 0) {
          return `Ticket #${i + 1}: per-order limit must be a positive integer.`
        }
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
    setStep((step + 1) as Step)
  }

  const goBack = () => {
    setError("")
    setStep((step - 1) as Step)
  }

  const persist = async (intent: "draft" | "submit") => {
    // Validate critical steps regardless of which step the user is on.
    for (const s of [0, 1] as Step[]) {
      const err = validateStep(s)
      if (err) {
        setError(err)
        setStep(s)
        return
      }
    }
    setError("")
    setBusy(intent)

    try {
      const payload = buildPayload(details, tickets, media)
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

      if (intent === "submit") {
        const submitRes = await fetch(
          `${API_URL}/api/organizer/events/${eventId}/submit`,
          { method: "POST", credentials: "include" },
        )
        const submitData = await submitRes.json()
        if (!submitData?.success) {
          // Saved as draft but submit failed — still send them to the list to retry.
          setError(submitData?.message || "Saved as draft but submit failed.")
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
          Save as a draft anytime. Submit when you&rsquo;re ready for admin review.
        </p>
      </div>

      {/* Stepper */}
      <StepIndicator current={step} />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
        {step === 0 && <DetailsStep value={details} onChange={setDetails} />}
        {step === 1 && <TicketsStep value={tickets} onChange={setTickets} />}
        {step === 2 && <MediaStep value={media} onChange={setMedia} />}
        {step === 3 && <ReviewStep details={details} tickets={tickets} media={media} />}
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

        {step < 3 ? (
          <Button type="button" onClick={goNext}>
            Next <ChevronRight />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => persist("draft")}
              disabled={busy !== null}
            >
              {busy === "draft" ? <Loader className="animate-spin" /> : <Save />}
              Save as draft
            </Button>
            <Button type="button" onClick={() => persist("submit")} disabled={busy !== null}>
              {busy === "submit" ? <Loader className="animate-spin" /> : <Send />}
              Submit for review
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
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
    <div className="space-y-5">
      <StepHeader icon={Sparkles} title="Event details" />

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
          <Input
            id="category"
            type="text"
            value={value.category}
            onChange={(e) => upd({ category: e.target.value })}
            placeholder="music, theatre, sports…"
          />
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
    </div>
  )
}

function TicketsStep({
  value,
  onChange,
}: {
  value: TicketTypeForm[]
  onChange: (v: TicketTypeForm[]) => void
}) {
  const updTicket = (idx: number, patch: Partial<TicketTypeForm>) => {
    const next = value.slice()
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Tag className="h-5 w-5 text-primary" />
          Ticket types
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, emptyTicket()])}
        >
          <Plus /> Add ticket
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Each ticket type can have its own price, quantity, and sale window.
      </p>

      <div className="space-y-3">
        {value.map((t, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-background/40 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ticket #{idx + 1}
              </span>
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                  aria-label="Remove ticket type"
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
                  placeholder="General, VIP, Early Bird…"
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
              <div className="space-y-1.5">
                <FieldLabel>Sale start (optional)</FieldLabel>
                <Input
                  type="datetime-local"
                  value={t.sale_start}
                  onChange={(e) => updTicket(idx, { sale_start: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Sale end (optional)</FieldLabel>
                <Input
                  type="datetime-local"
                  value={t.sale_end}
                  onChange={(e) => updTicket(idx, { sale_end: e.target.value })}
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

function MediaStep({
  value,
  onChange,
}: {
  value: MediaForm
  onChange: (v: MediaForm) => void
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
      onChange({ banner_url: data.data.url })
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="space-y-5">
      <StepHeader
        icon={ImageIcon}
        title="Media"
        subtitle="Upload a banner image or paste a public image URL."
      />

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
          title="Upload banner image"
          aria-label="Upload banner image"
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

      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}

      <div className="space-y-1.5">
        <FieldLabel htmlFor="banner_url">Or paste a public image URL</FieldLabel>
        <Input
          id="banner_url"
          type="url"
          value={value.banner_url}
          onChange={(e) => onChange({ banner_url: e.target.value })}
          placeholder="https://…"
          disabled={uploading}
        />
      </div>

      {value.banner_url && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.banner_url}
            alt="Banner preview"
            className="aspect-21/9 w-full rounded-xl border border-border object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          <button
            type="button"
            onClick={() => onChange({ banner_url: "" })}
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
}: {
  details: DetailsForm
  tickets: TicketTypeForm[]
  media: MediaForm
}) {
  const totalSeats = tickets.reduce(
    (sum, t) => sum + (parseInt(t.quantity_total, 10) || 0),
    0,
  )

  return (
    <div className="space-y-5">
      <StepHeader icon={Check} title="Review" />

      <ReviewBlock title="Event">
        <Row label="Title" value={details.title || "—"} />
        <Row label="Category" value={details.category || "—"} />
        <Row label="Starts" value={details.start_time || "—"} />
        <Row label="Ends" value={details.end_time || "—"} />
        <Row label="Venue" value={details.venue_name || "—"} />
        <Row label="Address" value={details.venue_address || "—"} />
        <Row label="Capacity" value={details.capacity || "—"} />
      </ReviewBlock>

      <ReviewBlock title={`Ticket types (${tickets.length}) · ${totalSeats} total seats`}>
        {tickets.map((t, i) => (
          <div key={i} className="py-1.5 text-sm">
            <span className="font-semibold text-foreground">
              {t.name || `Ticket #${i + 1}`}
            </span>
            <span className="text-muted-foreground">
              {" · "}LKR {t.price || "0"} · {t.quantity_total || "0"} seats · max{" "}
              {t.per_order_limit || "10"}/order
            </span>
          </div>
        ))}
      </ReviewBlock>

      <ReviewBlock title="Media">
        <Row label="Banner URL" value={media.banner_url || "—"} />
      </ReviewBlock>

      <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Save as draft</strong> keeps it private. <strong>Submit for review</strong> sends it to
          admins — you won&rsquo;t be able to edit until they respond.
        </span>
      </div>
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

