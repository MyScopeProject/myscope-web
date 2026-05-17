"use client"

import * as React from "react"
import { AlertCircle, Armchair, Loader, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export type SeatStatus = "available" | "held" | "booked" | "disabled"
export type SeatType = "standard" | "accessible" | "restricted_view" | "aisle"

export interface SeatTicketType {
  id: string
  name: string
  price: number
}

export interface SeatMapSeat {
  id: string
  seat_number: string
  seat_label: string | null
  seat_type: SeatType
  status: SeatStatus
  ticket_type: SeatTicketType | null
}

export interface SelectedSeat {
  id: string
  seat_label: string
  ticket_type_id: string
  ticket_type_name: string
  price: number
}

interface SeatMapResponse {
  success: boolean
  data?: {
    event_id: string
    seating_mode: string
    sections: Record<string, Record<string, SeatMapSeat[]>>
  }
  message?: string
}

interface Props {
  eventId: string
  maxPerOrder?: number
  onSelectionChange: (seats: SelectedSeat[], totalAmount: number) => void
}

const REFRESH_MS = 30_000

export function SeatMapPicker({ eventId, maxPerOrder = 8, onSelectionChange }: Props) {
  const [sections, setSections] = React.useState<Record<string, Record<string, SeatMapSeat[]>>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [selectionWarning, setSelectionWarning] = React.useState<string | null>(null)
  const [lastRefreshAt, setLastRefreshAt] = React.useState<number>(Date.now())

  // Flat list of all seats — handy for lookups across sections.
  const allSeats = React.useMemo(() => {
    const out: SeatMapSeat[] = []
    for (const rows of Object.values(sections)) {
      for (const row of Object.values(rows)) {
        out.push(...row)
      }
    }
    return out
  }, [sections])

  // The single tier the user is currently committed to (first selection wins).
  // null = no commitment yet. Used to grey out seats from other tiers.
  const activeTicketTypeId = React.useMemo(() => {
    if (selectedIds.size === 0) return null
    const first = allSeats.find(s => selectedIds.has(s.id))
    return first?.ticket_type?.id ?? null
  }, [selectedIds, allSeats])

  // Fetch (called on mount + every 30s + manual refresh).
  const fetchSeats = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/seats`)
      const data = (await res.json()) as SeatMapResponse
      if (!data.success || !data.data) {
        setError(data.message || "Couldn't load seat map.")
        return
      }
      setSections(data.data.sections || {})
      setLastRefreshAt(Date.now())
      setError(null)
    } catch {
      setError("Network error loading seats.")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  React.useEffect(() => {
    fetchSeats()
  }, [fetchSeats])

  // Background refresh — drop selected seats that the server now reports as booked
  // (someone else paid). Keep everything else as the user picked.
  React.useEffect(() => {
    const t = setInterval(fetchSeats, REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchSeats])

  React.useEffect(() => {
    if (selectedIds.size === 0) return
    const bookedNow = new Set(
      allSeats.filter(s => s.status === "booked" && selectedIds.has(s.id)).map(s => s.id),
    )
    if (bookedNow.size === 0) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      bookedNow.forEach(id => next.delete(id))
      return next
    })
    setSelectionWarning(
      bookedNow.size === 1
        ? "One of your seats was just booked by someone else — it's been removed from your selection."
        : `${bookedNow.size} of your seats were just booked by others — they've been removed.`,
    )
  }, [allSeats, selectedIds])

  // Notify parent whenever the selection changes.
  React.useEffect(() => {
    const picked: SelectedSeat[] = []
    let total = 0
    for (const seat of allSeats) {
      if (!selectedIds.has(seat.id) || !seat.ticket_type) continue
      picked.push({
        id: seat.id,
        seat_label: seat.seat_label || `${seat.seat_number}`,
        ticket_type_id: seat.ticket_type.id,
        ticket_type_name: seat.ticket_type.name,
        price: seat.ticket_type.price,
      })
      total += seat.ticket_type.price
    }
    onSelectionChange(picked, total)
  }, [selectedIds, allSeats, onSelectionChange])

  const toggleSeat = (seat: SeatMapSeat) => {
    setSelectionWarning(null)
    if (seat.status !== "available") return
    if (!seat.ticket_type) return // unpriced seat — refuse silently

    // Single-tier guard: once a tier is committed, block clicks on other tiers.
    if (
      activeTicketTypeId &&
      seat.ticket_type.id !== activeTicketTypeId &&
      !selectedIds.has(seat.id)
    ) {
      setSelectionWarning(
        "Only one ticket type per order. Deselect your current seats to pick a different tier.",
      )
      return
    }

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(seat.id)) {
        next.delete(seat.id)
      } else {
        if (next.size >= maxPerOrder) {
          setSelectionWarning(`Maximum ${maxPerOrder} seats per order.`)
          return prev
        }
        next.add(seat.id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <div>{error}</div>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchSeats() }}
            className="mt-1 inline-flex items-center gap-1 text-xs underline"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      </div>
    )
  }

  const sectionNames = Object.keys(sections)
  if (sectionNames.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
        No seats have been set up for this event yet.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stage */}
      <div className="rounded-lg border border-dashed border-border bg-muted/30 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Stage / Screen
      </div>

      {selectionWarning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{selectionWarning}</span>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6 overflow-x-auto pb-2">
        {sectionNames.map(sectionName => {
          const rows = sections[sectionName]
          // Cheap section price hint — first seat with a ticket type.
          const firstPriced = Object.values(rows)
            .flat()
            .find(s => s.ticket_type)
          const sectionTicketTypeId = firstPriced?.ticket_type?.id ?? null
          const sectionIsDimmed =
            activeTicketTypeId !== null && sectionTicketTypeId !== activeTicketTypeId

          return (
            <div key={sectionName}>
              {/* flex-wrap so long section names + price hints don't widen the
                  scroll plane beyond the actual seat row. */}
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <Armchair className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {sectionName}
                </span>
                {firstPriced?.ticket_type && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    · {firstPriced.ticket_type.name} · LKR{" "}
                    {firstPriced.ticket_type.price.toLocaleString()}
                  </span>
                )}
                {sectionIsDimmed && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    (locked — different tier)
                  </span>
                )}
              </div>
              <div className={cn("space-y-1", sectionIsDimmed && "opacity-40")}>
                {Object.entries(rows).map(([rowLabel, seats]) => (
                  // flex-nowrap keeps a row visually intact — the parent's
                  // overflow-x-auto handles wide rows on narrow screens instead
                  // of letting seats wrap into multiple lines (which breaks the
                  // mental model of "row A is one line").
                  <div key={rowLabel} className="flex items-center gap-1">
                    <span className="w-5 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {rowLabel}
                    </span>
                    <div className="flex gap-1">
                      {seats.map(seat => {
                        const isSelected = selectedIds.has(seat.id)
                        const otherTier =
                          activeTicketTypeId !== null &&
                          seat.ticket_type?.id !== activeTicketTypeId
                        return (
                          <SeatButton
                            key={seat.id}
                            seat={seat}
                            isSelected={isSelected}
                            otherTier={!isSelected && otherTier}
                            onClick={() => toggleSeat(seat)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend + last-refresh */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <LegendSwatch className="bg-emerald-100 ring-emerald-500/40 dark:bg-emerald-500/20" label="Available" />
        <LegendSwatch className="bg-primary ring-primary" label="Selected" />
        <LegendSwatch className="bg-amber-100 ring-amber-500/40 dark:bg-amber-500/20" label="Held" />
        <LegendSwatch className="bg-destructive/20 ring-destructive/40" label="Booked" />
        <LegendSwatch
          className="bg-blue-100 ring-blue-500/40 dark:bg-blue-500/20"
          label="Accessible"
          glyph="H"
        />
        <span className="ml-auto inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setLoading(true); fetchSeats() }}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 hover:bg-muted"
            aria-label="Refresh seat availability"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </button>
          <span className="text-muted-foreground/70">
            updated {formatRelative(Date.now() - lastRefreshAt)} ago
          </span>
        </span>
      </div>
    </div>
  )
}

function SeatButton({
  seat,
  isSelected,
  otherTier,
  onClick,
}: {
  seat: SeatMapSeat
  isSelected: boolean
  otherTier: boolean
  onClick: () => void
}) {
  const isAccessible = seat.seat_type === "accessible"
  const isBooked = seat.status === "booked"
  const isHeld = seat.status === "held"
  const isDisabled = seat.status === "disabled" || seat.status === "booked" || seat.status === "held"
  const lockedTier = !isSelected && otherTier && seat.status === "available"

  const title = seat.ticket_type
    ? `${seat.seat_label || seat.seat_number} · ${seat.ticket_type.name} · LKR ${seat.ticket_type.price.toLocaleString()}${
        lockedTier ? " (different tier — deselect first)" : ""
      }`
    : seat.seat_label || seat.seat_number

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      aria-pressed={isSelected ? "true" : "false"}
      className={cn(
        // Smaller seats on phones so more of a wide row fits before triggering
        // the parent's horizontal scroll; full size from sm: up.
        "flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[9px] ring-1 transition-colors sm:h-7 sm:w-7 sm:text-[10px]",
        // baseline by status
        isBooked && "cursor-not-allowed bg-destructive/20 text-destructive ring-destructive/40 opacity-60",
        isHeld && "cursor-not-allowed bg-amber-100 text-amber-700 ring-amber-500/40 dark:bg-amber-500/20 dark:text-amber-400",
        seat.status === "disabled" && "cursor-not-allowed bg-muted text-muted-foreground/40 ring-border opacity-50",
        // selected overrides everything
        isSelected && "bg-primary text-primary-foreground ring-primary hover:bg-primary/90",
        // available
        !isSelected && !isDisabled && !isAccessible && "bg-emerald-100 text-emerald-900 ring-emerald-500/40 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300",
        // accessible
        !isSelected && !isDisabled && isAccessible && "bg-blue-100 text-blue-700 ring-blue-500/40 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300",
        // locked-by-tier — visually muted but still hoverable (click surfaces the warning)
        lockedTier && "cursor-not-allowed opacity-30",
      )}
    >
      {isAccessible ? "H" : seat.seat_number}
    </button>
  )
}

function LegendSwatch({
  className,
  label,
  glyph,
}: {
  className: string
  label: string
  glyph?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "flex h-3.5 w-3.5 items-center justify-center rounded font-mono text-[8px] ring-1",
          className,
        )}
      >
        {glyph}
      </span>
      {label}
    </span>
  )
}

function formatRelative(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}
