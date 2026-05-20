"use client"

import * as React from "react"
import { AlertCircle, Armchair, Loader, RefreshCw, ZoomIn, ZoomOut } from "lucide-react"
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
  // Server-set: true if the requesting user is the one holding this seat.
  // The picker treats these as still-selectable (they can release).
  held_by_me?: boolean
  // ISO timestamp of when this user's hold on this seat expires (server-clock).
  held_until?: string | null
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
  // Zoom level for the seat grid — useful on mobile where tap targets are small
  // for wide venues. Applied as a CSS transform with a per-level scale factor.
  const [zoom, setZoom] = React.useState(1)
  const minZoom = 0.75
  const maxZoom = 1.75
  // When a user clicks a seat in a different tier than their current selection,
  // we stash it here so the warning banner can offer a one-click "switch tier"
  // action (release current holds → hold the new seat) instead of forcing the
  // user to manually deselect everything.
  const [tierSwitchPending, setTierSwitchPending] = React.useState<{
    targetSeat: SeatMapSeat
    targetTierName: string
    currentTierName: string
  } | null>(null)
  const [tierSwitching, setTierSwitching] = React.useState(false)
  const [lastRefreshAt, setLastRefreshAt] = React.useState<number>(Date.now())
  // Seats with an in-flight hold or release call. Used to (a) disable double
  // clicks while a request is pending and (b) skip server-state reconciliation
  // for these IDs so the optimistic update isn't clobbered by a stale fetch.
  const [inFlightIds, setInFlightIds] = React.useState<Set<string>>(new Set())

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
  // credentials: include lets the server detect the logged-in user so it can
  // mark seats with held_by_me: true (which the picker then pre-selects).
  const fetchSeats = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/seats`, {
        credentials: "include",
      })
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

  // Reconcile selection with server truth on every fetch:
  // - Any seat with held_by_me:true is added to selectedIds (covers refresh
  //   recovery — user comes back to the page and sees their existing holds).
  // - Any seat in selectedIds that the server no longer reports as held by me
  //   is removed (someone else booked it, or my hold expired via pg_cron).
  // In-flight seats are skipped so optimistic updates aren't clobbered.
  React.useEffect(() => {
    if (allSeats.length === 0) return
    const heldByMe = new Set(allSeats.filter(s => s.held_by_me).map(s => s.id))

    setSelectedIds(prev => {
      const next = new Set<string>()
      // Keep prev items that are either still mine OR currently in-flight.
      for (const id of prev) {
        if (heldByMe.has(id) || inFlightIds.has(id)) next.add(id)
      }
      // Add any held-by-me seats that aren't already selected.
      for (const id of heldByMe) next.add(id)
      // No-op if unchanged.
      if (next.size === prev.size && [...prev].every(id => next.has(id))) return prev
      return next
    })

    // Surface the case where a previously-selected seat was taken / expired.
    const dropped = [...selectedIds].filter(
      id => !heldByMe.has(id) && !inFlightIds.has(id),
    )
    if (dropped.length > 0) {
      const droppedSeats = allSeats.filter(s => dropped.includes(s.id))
      const bookedDropped = droppedSeats.filter(s => s.status === "booked")
      if (bookedDropped.length > 0) {
        setSelectionWarning(
          bookedDropped.length === 1
            ? "One of your seats was just booked by someone else."
            : `${bookedDropped.length} of your seats were just booked by others.`,
        )
      } else {
        setSelectionWarning(
          "Your seat hold expired. Please re-select your seats and complete payment within 10 minutes.",
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSeats])

  // Keep the latest callback in a ref so the notify effect doesn't depend on
  // its identity. Parents commonly pass an inline arrow function, which changes
  // every render — depending on it here would retrigger the effect, call back
  // into the parent's setState, and spin into an update loop.
  const onSelectionChangeRef = React.useRef(onSelectionChange)
  React.useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  })

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
    onSelectionChangeRef.current(picked, total)
  }, [selectedIds, allSeats])

  // Track a seat as in-flight (disables clicks + protects from reconcile races).
  const markInFlight = React.useCallback((id: string, on: boolean) => {
    setInFlightIds(prev => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const toggleSeat = async (seat: SeatMapSeat) => {
    setSelectionWarning(null)
    setTierSwitchPending(null)
    if (inFlightIds.has(seat.id)) return // already busy

    const isCurrentlySelected = selectedIds.has(seat.id)

    // ----- Release path -----
    if (isCurrentlySelected) {
      // Optimistically deselect; if the server fails, reconcile will restore.
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(seat.id)
        return next
      })
      markInFlight(seat.id, true)
      try {
        await fetch(`${API_URL}/api/events/${eventId}/seats/release`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seat_ids: [seat.id] }),
        })
      } catch {
        // Best-effort — refresh will reconcile on next tick.
      } finally {
        markInFlight(seat.id, false)
      }
      return
    }

    // ----- Hold path: pre-flight checks -----
    if (!seat.ticket_type) return // unpriced seat
    if (seat.status === "booked" || seat.status === "disabled") return
    // Held by someone else — we'd lose the race anyway.
    if (seat.status === "held" && !seat.held_by_me) return

    if (activeTicketTypeId && seat.ticket_type.id !== activeTicketTypeId) {
      const currentTierName =
        allSeats.find(s => selectedIds.has(s.id))?.ticket_type?.name || "current tier"
      // Stash the click so the warning banner can offer a one-click switch
      // (release all current holds → hold this seat).
      setTierSwitchPending({
        targetSeat: seat,
        targetTierName: seat.ticket_type.name,
        currentTierName,
      })
      return
    }
    if (selectedIds.size >= maxPerOrder) {
      setSelectionWarning(`Maximum ${maxPerOrder} seats per order.`)
      return
    }

    // Optimistic add; revert if the server rejects.
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.add(seat.id)
      return next
    })
    markInFlight(seat.id, true)
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/seats/hold`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seat_ids: [seat.id] }),
      })
      if (!res.ok) {
        // Revert optimistic add.
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(seat.id)
          return next
        })
        const body = await res.json().catch(() => null)
        if (res.status === 409) {
          setSelectionWarning(
            `Seat ${seat.seat_label ?? seat.seat_number} was just taken by someone else.`,
          )
          // Refresh so the seat shows the right status immediately.
          fetchSeats()
        } else if (res.status === 401) {
          setSelectionWarning("Please sign in to reserve seats.")
        } else {
          // Surface the backend's actual reason when it sends one.
          setSelectionWarning(body?.message || "Couldn't hold that seat. Please try again.")
        }
      }
    } catch {
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(seat.id)
        return next
      })
      setSelectionWarning("Network error. Please try again.")
    } finally {
      markInFlight(seat.id, false)
    }
  }

  // One-click "switch tier": release every currently-held seat, then hold the
  // target seat. Called from the warning banner when the user clicks a seat in
  // a different tier — much friendlier than the old "deselect everything
  // yourself" workflow.
  const switchTier = async () => {
    if (!tierSwitchPending) return
    const target = tierSwitchPending.targetSeat
    setTierSwitching(true)
    setSelectionWarning(null)
    try {
      const toRelease = [...selectedIds]
      if (toRelease.length > 0) {
        await fetch(`${API_URL}/api/events/${eventId}/seats/release`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seat_ids: toRelease }),
        }).catch(() => {})
      }
      // Local state mirrors what the server just did.
      setSelectedIds(new Set())
      setTierSwitchPending(null)
      // Re-fire the click on the target seat — now there's no active tier
      // conflict so it takes the normal hold path.
      await toggleSeat(target)
    } finally {
      setTierSwitching(false)
    }
  }

  // Best-effort release on unmount / tab close. Uses sendBeacon so the
  // browser fires it even during a navigation away.
  React.useEffect(() => {
    const release = (ids: string[]) => {
      if (ids.length === 0) return
      const url = `${API_URL}/api/events/${eventId}/seats/release`
      const body = JSON.stringify({ seat_ids: ids })
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        // sendBeacon doesn't carry cookies in some browsers if the URL is
        // cross-origin without credentials, but since the API is on the same
        // parent domain (.myscope.lk) the auth cookie is included.
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))
      } else {
        // Fallback to keepalive fetch.
        fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {})
      }
    }

    const onUnload = () => release([...selectedIds])
    window.addEventListener("beforeunload", onUnload)
    return () => {
      window.removeEventListener("beforeunload", onUnload)
      // Component unmount (e.g. user navigates within the SPA away from
      // checkout without paying). Release everything we still hold.
      release([...selectedIds])
    }
  }, [eventId, selectedIds])

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

      {tierSwitchPending && (
        <div className="flex flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your cart has <strong>{tierSwitchPending.currentTierName}</strong> seats.
              Switch to <strong>{tierSwitchPending.targetTierName}</strong>?
            </span>
          </div>
          <div className="flex shrink-0 gap-2 sm:ml-3">
            <button
              type="button"
              onClick={() => setTierSwitchPending(null)}
              disabled={tierSwitching}
              className="rounded-md px-3 py-1.5 text-xs font-medium hover:bg-amber-500/15 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={switchTier}
              disabled={tierSwitching}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              {tierSwitching ? "Switching…" : `Switch to ${tierSwitchPending.targetTierName}`}
            </button>
          </div>
        </div>
      )}

      {/* Zoom controls — handy on mobile for wide venues. transform-origin
          top-left keeps content anchored so users scroll naturally to find
          their section. */}
      <div className="flex items-center justify-end gap-1.5 text-xs">
        <span className="text-muted-foreground">Zoom</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(minZoom, Math.round((z - 0.25) * 100) / 100))}
          disabled={zoom <= minZoom}
          aria-label="Zoom out"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-12 text-center font-mono tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(maxZoom, Math.round((z + 0.25) * 100) / 100))}
          disabled={zoom >= maxZoom}
          aria-label="Zoom in"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sections — wrapped in a CSS zoom container so the existing seat
          sizing keeps working unchanged. CSS `zoom` (vs transform: scale)
          reflows surrounding content correctly so the scroll container
          knows the scaled width. */}
      <div className="space-y-6 overflow-x-auto pb-2 [zoom:var(--seat-zoom)]"
           style={{ '--seat-zoom': zoom } as React.CSSProperties}
      >
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
                            inFlight={inFlightIds.has(seat.id)}
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
  inFlight,
  onClick,
}: {
  seat: SeatMapSeat
  isSelected: boolean
  otherTier: boolean
  inFlight: boolean
  onClick: () => void
}) {
  const isAccessible = seat.seat_type === "accessible"
  const isBooked = seat.status === "booked"
  // A "held" seat is only foreign if the *current user* doesn't hold it —
  // their own holds render as selected (and remain clickable to release).
  const isForeignHeld = seat.status === "held" && !isSelected
  // Disabled: foreign holds, booked, structurally disabled, or pending request.
  const isDisabled =
    seat.status === "disabled" || isBooked || isForeignHeld || inFlight
  const lockedTier = !isSelected && otherTier && seat.status === "available"

  const title = seat.ticket_type
    ? `${seat.seat_label || seat.seat_number} · ${seat.ticket_type.name} · LKR ${seat.ticket_type.price.toLocaleString()}${
        lockedTier ? " (different tier — click to switch)" : ""
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
        isForeignHeld && "cursor-not-allowed bg-amber-100 text-amber-700 ring-amber-500/40 dark:bg-amber-500/20 dark:text-amber-400",
        seat.status === "disabled" && "cursor-not-allowed bg-muted text-muted-foreground/40 ring-border opacity-50",
        // selected overrides everything
        isSelected && "bg-primary text-primary-foreground ring-primary hover:bg-primary/90",
        // mid-flight (request in progress) — soft visual cue
        inFlight && "animate-pulse",
        // available
        !isSelected && !isDisabled && !isAccessible && "bg-emerald-100 text-emerald-900 ring-emerald-500/40 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300",
        // accessible
        !isSelected && !isDisabled && isAccessible && "bg-blue-100 text-blue-700 ring-blue-500/40 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300",
        // locked-by-tier — visually muted but clickable; click opens the
        // "Switch to {tier}?" banner so the user can move tiers in one step.
        lockedTier && "cursor-pointer opacity-40 hover:opacity-70",
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
