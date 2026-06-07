"use client"

import * as React from "react"
import {
  AlertCircle,
  Clock,
  Loader,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// mm:ss for the hold countdown.
const fmtMMSS = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

// Tier swatch palette — must mirror the admin builder's TIER_PALETTE so the
// legend dots match what the organizer/admin sees when building the map.
const TIER_PALETTE = ["#7F77DD", "#1D9E75", "#BA7517", "#D85A30", "#185FA5", "#993556", "#6B7280"]
const tierColorByIndex = (i: number) => TIER_PALETTE[i % TIER_PALETTE.length] || TIER_PALETTE[0]


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
  // Canvas position for the visual seat-map renderer. NULL on legacy
  // grid-only events; the picker falls back to the row/section grid view.
  x?: number | null
  y?: number | null
  rotation?: number | null
}

export interface LayoutDecor {
  id?: string
  kind: "rect" | "text" | "line"
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  label?: string
  fill?: string
  color?: string
}

export interface LayoutMeta {
  viewbox_width: number
  viewbox_height: number
  background_image_url: string | null
  decor: LayoutDecor[]
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
    // Only present for visual-mode events (those built via the canvas builder).
    // When omitted, the picker renders the legacy section/row grid.
    layout?: LayoutMeta
  }
  message?: string
}

interface Props {
  eventId: string
  maxPerOrder?: number
  onSelectionChange: (seats: SelectedSeat[], totalAmount: number) => void
  // Controlled zoom — when supplied, the parent owns the zoom state and can
  // render <ZoomControls/> wherever it wants (e.g. inside its own header).
  // When omitted, the picker manages zoom internally and shows its own
  // toolbar above the seatmap.
  zoom?: number
  onZoomChange?: (z: number) => void
}

export const SEATMAP_MIN_ZOOM = 0.5
export const SEATMAP_MAX_ZOOM = 4
export const clampSeatmapZoom = (v: number) =>
  Math.max(SEATMAP_MIN_ZOOM, Math.min(SEATMAP_MAX_ZOOM, v))

const REFRESH_MS = 30_000

export function SeatMapPicker({
  eventId,
  maxPerOrder = 8,
  onSelectionChange,
  zoom: zoomProp,
  onZoomChange,
}: Props) {
  const [sections, setSections] = React.useState<Record<string, Record<string, SeatMapSeat[]>>>({})
  const [layout, setLayout] = React.useState<LayoutMeta | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [selectionWarning, setSelectionWarning] = React.useState<string | null>(null)
  // Zoom level. Range widened so the user can both fit the whole venue on
  // screen (zoom-out) and tap individual seats comfortably on mobile (zoom-in).
  // Gesture-driven zoom — no buttons. Drives the inner canvas width as
  // `${zoom * 100}%` of its scroll container so:
  //   - ctrl/⌘ + wheel zooms on desktop (incl. macOS trackpad pinch which
  //     synthesises wheel events with ctrlKey set)
  //   - two-finger pinch zooms on mobile
  //   - default 1× = fits container width perfectly
  // Range is wider than 1× both ways so users can zoom out below the
  // fit-to-width baseline too.
  // Internal fallback zoom — only used when the parent doesn't supply
  // a controlled `zoom` prop. The controlled path lets the parent render
  // <ZoomControls/> wherever it wants (e.g. inside its own card header).
  const [internalZoom, setInternalZoom] = React.useState(1)
  const isControlled = zoomProp !== undefined
  const zoom = isControlled ? (zoomProp as number) : internalZoom
  const setZoom = React.useCallback(
    (updater: number | ((z: number) => number)) => {
      const next = typeof updater === 'function' ? (updater as (z: number) => number)(zoom) : updater
      if (isControlled) onZoomChange?.(next)
      else setInternalZoom(next)
    },
    [isControlled, onZoomChange, zoom],
  )
  const MIN_ZOOM = SEATMAP_MIN_ZOOM
  const MAX_ZOOM = SEATMAP_MAX_ZOOM
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const pinchStartRef = React.useRef<{ dist: number; zoom: number } | null>(null)
  const clampZoom = React.useCallback(
    (v: number) => clampSeatmapZoom(v),
    [],
  )
  const zoomIn   = () => setZoom(z => clampZoom(z * 1.2))
  const zoomOut  = () => setZoom(z => clampZoom(z / 1.2))
  const zoomReset = () => setZoom(1)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const clamp = clampZoom

    const onWheel = (e: WheelEvent) => {
      // Only act when the user holds Ctrl (Windows/Linux) or ⌘ (macOS pinch
      // trackpad gestures also surface as ctrl+wheel in browsers).
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      setZoom(z => clamp(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
    }
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      pinchStartRef.current = { dist: Math.hypot(dx, dy), zoom }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchStartRef.current) return
      e.preventDefault()
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      const dist = Math.hypot(dx, dy)
      const factor = dist / pinchStartRef.current.dist
      setZoom(clamp(pinchStartRef.current.zoom * factor))
    }
    const onTouchEnd = () => { pinchStartRef.current = null }

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd)
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [zoom])
  const [lastRefreshAt, setLastRefreshAt] = React.useState<number>(Date.now())
  // Seats with an in-flight hold or release call. Used to (a) disable double
  // clicks while a request is pending and (b) skip server-state reconciliation
  // for these IDs so the optimistic update isn't clobbered by a stale fetch.
  const [inFlightIds, setInFlightIds] = React.useState<Set<string>>(new Set())
  // Hovered seat (visual mode) — drives the floating info card. Cleared on
  // pointerleave or when the seat unmounts.
  const [hoveredSeat, setHoveredSeat] = React.useState<SeatMapSeat | null>(null)

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

  // Tier mixing is allowed — buyers commonly want a couple of premium seats
  // plus several regular ones in one order. The cart total + the parent
  // checkout sum per-seat prices, so no extra wiring is needed. Kept as
  // `null` so existing UI bindings (which dimmed other-tier sections) just
  // no-op.
  const activeTicketTypeId: string | null = null

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
      setLayout(data.data.layout ?? null)
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

    // Mixed-tier selection is allowed (different sections / different
    // prices in one order). The cart total is computed from each seat's
    // own ticket_type.price below.
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

  // Live hold countdown — the earliest held_until among seats this user holds is
  // the deadline. Tick every second so the banner shows MM:SS remaining.
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  React.useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const holdDeadline = React.useMemo(() => {
    const times = allSeats
      .filter(s => s.held_by_me && s.held_until)
      .map(s => new Date(s.held_until as string).getTime())
      .filter(t => Number.isFinite(t))
    return times.length ? Math.min(...times) : null
  }, [allSeats])
  const holdSecondsLeft = holdDeadline !== null ? Math.max(0, Math.round((holdDeadline - nowMs) / 1000)) : null

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

  // Visual mode: render the SVG canvas (per-seat x/y + decor) when every seat
  // has coords. Partially-positioned maps fall through to grid rendering so
  // legacy events keep working unchanged.
  const isVisual =
    layout !== null &&
    allSeats.length > 0 &&
    allSeats.every(s => s.x != null && s.y != null)

  // Unique tier list (first-seen order) — drives the legend swatches.
  // Colors are matched to the admin builder's palette via the tier's index
  // in this list. Plain computation (not useMemo) so the hooks above the
  // early-return gates aren't reordered when data finishes loading.
  const tierList = (() => {
    const byId = new Map<string, SeatTicketType>()
    for (const s of allSeats) {
      if (s.ticket_type && !byId.has(s.ticket_type.id)) byId.set(s.ticket_type.id, s.ticket_type)
    }
    return Array.from(byId.values())
  })()
  const tierIndex = new Map<string, number>()
  tierList.forEach((t, i) => tierIndex.set(t.id, i))

  // Selected total — drives the "N seats selected · LKR X" footer.
  let selectedTotal = 0
  for (const s of allSeats) {
    if (selectedIds.has(s.id) && s.ticket_type) selectedTotal += s.ticket_type.price
  }

  return (
    <div className="space-y-5">
      {/* Expired-hold notice only — silent during the active hold window
          (matches MyTickets / TicketBox / BookMyShow behaviour). The picker
          still reads `holdSecondsLeft` internally to surface the expiry
          message and to reconcile selection on the next fetch tick. */}
      {holdSecondsLeft !== null && holdSecondsLeft <= 0 && selectedIds.size > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          <Clock className="h-4 w-4 shrink-0" />
          <span>Your hold has expired — please re-select your seats.</span>
        </div>
      )}

      {/* Stage — only in grid mode. Visual mode draws stage as canvas decor. */}
      {!isVisual && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Stage / Screen
        </div>
      )}

      {selectionWarning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{selectionWarning}</span>
        </div>
      )}

      {/* Zoom toolbar — only rendered when the picker is uncontrolled. In
          controlled mode the parent owns zoom state and renders its own
          <ZoomControls/> wherever it likes. */}
      {!isControlled && (
        <div className="flex justify-end">
          <ZoomControls
            zoom={zoom} min={MIN_ZOOM} max={MAX_ZOOM}
            onIn={zoomIn} onOut={zoomOut} onReset={zoomReset}
          />
        </div>
      )}

      {/* Visual canvas — only when every seat has x/y. Default 1× fits
          the container width; gesture zoom (ctrl/⌘+wheel on desktop,
          two-finger pinch on mobile) grows the inner element beyond it,
          letting the scroll container handle overflow naturally. */}
      {isVisual && layout && (
        <div
          ref={scrollRef}
          // touch-action: pan-x pan-y keeps panning (scrolling) responsive
          // while disabling the browser's native pinch — that lets our
          // two-finger touchmove handler run instead of the page zooming.
          className="overflow-auto pb-2 max-h-[80vh] [touch-action:pan-x_pan-y]"
        >
          <div
            className="relative"
            style={{ width: `${zoom * 100}%` }}
          >
            <VisualSeatMap
              layout={layout}
              allSeats={allSeats}
              selectedIds={selectedIds}
              inFlightIds={inFlightIds}
              activeTicketTypeId={activeTicketTypeId}
              onSeatClick={toggleSeat}
              onSeatHover={setHoveredSeat}
              tierColorFor={(id) =>
                id !== undefined && tierIndex.has(id)
                  ? tierColorByIndex(tierIndex.get(id) as number)
                  : "#9CA3AF"
              }
            />
            {/* Floating seat info card — anchored above the hovered seat.
                Position is expressed as a percentage of the viewbox so it
                scales with the responsive SVG without needing a zoom factor. */}
            {hoveredSeat && hoveredSeat.x != null && hoveredSeat.y != null && (
              <SeatHoverCard
                seat={hoveredSeat}
                leftPct={(Number(hoveredSeat.x) / Number(layout.viewbox_width)) * 100}
                topPct={(Number(hoveredSeat.y) / Number(layout.viewbox_height)) * 100}
                tierIndex={hoveredSeat.ticket_type ? tierIndex.get(hoveredSeat.ticket_type.id) ?? 0 : 0}
                isSelected={selectedIds.has(hoveredSeat.id)}
              />
            )}
          </div>
        </div>
      )}

      {/* Selection footer — confirms how many seats are picked and the
          running total. Always visible (visual + grid modes) so users see
          their pick before reaching the cart. */}
      <div className="flex items-center justify-center text-sm">
        {selectedIds.size === 0 ? (
          <span className="text-muted-foreground">0 seats selected</span>
        ) : (
          <span className="text-foreground">
            <span className="font-semibold">
              {selectedIds.size} seat{selectedIds.size === 1 ? "" : "s"} selected
            </span>
            <span className="text-muted-foreground"> · LKR {selectedTotal.toLocaleString()}</span>
          </span>
        )}
      </div>

      {/* Sections — wrapped in a CSS zoom container so the existing seat
          sizing keeps working unchanged. CSS `zoom` (vs transform: scale)
          reflows surrounding content correctly so the scroll container
          knows the scaled width. */}
      {!isVisual && (
      <div ref={scrollRef}
           className="space-y-6 overflow-x-auto pb-2 [zoom:var(--seat-zoom)] [touch-action:pan-x_pan-y]"
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
              {/* Cinema-style section header: uppercase muted label with the
                  tier price inline, followed by a thin horizontal divider. */}
              <div className="mb-3 border-b border-border pb-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {sectionName}
                  </span>
                  {firstPriced?.ticket_type && (
                    <span className="text-xs text-muted-foreground">
                      ({firstPriced.ticket_type.name} · LKR{" "}
                      {firstPriced.ticket_type.price.toLocaleString()})
                    </span>
                  )}
                  {sectionIsDimmed && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      (locked — different tier)
                    </span>
                  )}
                </div>
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
      )}

      {/* Legend — ticket categories with their tier colors + price, plus
          "Sold" (any unavailable seat) and "Selected" so the buyer can read
          the canvas at a glance. Matches the reference theatre layout. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        {tierList.map((t, i) => (
          <span key={t.id} className="inline-flex items-center gap-1.5">
            <TierDot color={tierColorByIndex(i)} />
            <span className="font-medium text-foreground">{t.name}</span>
            <span>· LKR {t.price.toLocaleString()}</span>
          </span>
        ))}
        {tierList.length > 0 && (
          <span className="h-3 w-px bg-border" aria-hidden="true" />
        )}
        <span className="inline-flex items-center gap-1.5">
          <TierDot color="#4B5563" />
          <span>Sold</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full ring-2 ring-foreground" aria-hidden="true" />
          <span>Selected</span>
        </span>
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
        // Cinema-clean seat: rounded square, outlined when available, filled
        // gray when sold, near-black filled when picked. Tier color stays in
        // the legend + section header, not on the seat itself.
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[9px] transition-colors sm:h-7 sm:w-7 sm:text-[10px]",
        // available — outlined white square, thin gray border, dark glyph
        !isSelected && !isDisabled && "border border-border bg-card text-foreground hover:border-foreground/60",
        // unavailable (sold / held by someone else / disabled) — uniform
        // filled gray with washed-out glyph so it reads as "not pickable"
        isDisabled && "cursor-not-allowed border border-muted-foreground/20 bg-muted text-muted-foreground/50",
        // selected — solid dark square with white glyph
        isSelected && "border border-foreground bg-foreground text-background hover:bg-foreground/90",
        // accessibility seats keep the "H" glyph but otherwise share the
        // same look so the map stays visually quiet.
        inFlight && "animate-pulse",
        lockedTier && "cursor-pointer opacity-40 hover:opacity-70",
      )}
    >
      {isAccessible ? "H" : seat.seat_number}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Visual seat-map renderer
//
// SVG-based canvas mirroring the admin's Konva builder. Decor (stage, walls,
// labels) renders behind seats; each seat is a clickable <g> wired into the
// existing toggleSeat() handler so all the hold / release / tier-switch
// behaviour stays untouched.
//
// Mode selection lives in the parent — we only render when every seat has
// (x, y). Zoom is delegated to the parent's CSS `zoom:` container.
// ---------------------------------------------------------------------------

function VisualSeatMap({
  layout,
  allSeats,
  selectedIds,
  inFlightIds,
  activeTicketTypeId,
  onSeatClick,
  onSeatHover,
  tierColorFor,
}: {
  layout: LayoutMeta
  allSeats: SeatMapSeat[]
  selectedIds: Set<string>
  inFlightIds: Set<string>
  activeTicketTypeId: string | null
  onSeatClick: (seat: SeatMapSeat) => void
  onSeatHover: (seat: SeatMapSeat | null) => void
  tierColorFor: (ticketTypeId: string | undefined) => string
}) {
  const vbW = Number(layout.viewbox_width)  || 1600
  const vbH = Number(layout.viewbox_height) || 1200

  // Row letter extents for label rendering — group by (row_label) since the
  // picker doesn't track a "section" field on the seat (sections are the
  // outer dict key in the response, but we already flattened to allSeats).
  // To stay reference-correct (labels per *block*), we group on a synthetic
  // key derived from rounded-y, then take min/max X per group.
  const rowExtents = React.useMemo(() => {
    const map = new Map<string, { row: string; minX: number; maxX: number; y: number }>()
    for (const s of allSeats) {
      if (s.x == null || s.y == null) continue
      // Round y to 6px buckets to keep slightly-uneven row positions together
      // without merging unrelated visually-distinct rows.
      const bucket = Math.round(Number(s.y) / 6)
      const key = `${bucket}|${s.seat_label?.split("-")[0] ?? bucket}`
      const cur = map.get(key)
      const sx = Number(s.x)
      const sy = Number(s.y)
      if (cur) {
        if (sx < cur.minX) cur.minX = sx
        if (sx > cur.maxX) cur.maxX = sx
        cur.y = (cur.y + sy) / 2
      } else {
        // Derive a row label from seat_label "A-12" → "A". Fall back to seat
        // number if the label isn't dash-separated.
        const row = (s.seat_label?.includes("-") ? s.seat_label.split("-")[0] : "") || ""
        if (row) map.set(key, { row, minX: sx, maxX: sx, y: sy })
      }
    }
    return Array.from(map.values())
  }, [allSeats])

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="block w-full rounded-md border border-border bg-card touch-manipulation dark:bg-white/[0.92]"
      role="img"
      aria-label="Venue seat map"
    >
      {layout.background_image_url && (
        // Decor sits behind seats; floor plan goes furthest back at reduced
        // opacity so on-canvas labels stay readable.
        <image
          href={layout.background_image_url}
          x={0} y={0}
          width={vbW} height={vbH}
          opacity={0.55}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {(layout.decor || []).map((d, i) => (
        <DecorShape key={d.id ?? `decor-${i}`} d={d} />
      ))}
      {/* Row letter label on the LEFT only — cleaner read in cinema style. */}
      {rowExtents.map((r, i) => (
        <text
          key={`row-${i}`}
          x={r.minX - SEAT_R - 14} y={r.y}
          textAnchor="end" dominantBaseline="central"
          fontSize={11} fontWeight={500} fill="#9CA3AF"
          aria-hidden="true" pointerEvents="none"
        >{r.row}</text>
      ))}
      {allSeats.map(seat => (
        <VisualSeat
          key={seat.id}
          seat={seat}
          isSelected={selectedIds.has(seat.id)}
          inFlight={inFlightIds.has(seat.id)}
          otherTier={
            activeTicketTypeId !== null &&
            seat.ticket_type?.id !== activeTicketTypeId
          }
          tierColor={tierColorFor(seat.ticket_type?.id)}
          onClick={() => onSeatClick(seat)}
          onPointerEnter={() => onSeatHover(seat)}
          onPointerLeave={() => onSeatHover(null)}
        />
      ))}
    </svg>
  )
}

function DecorShape({ d }: { d: LayoutDecor }) {
  const x = d.x ?? 0
  const y = d.y ?? 0
  if (d.kind === "rect") {
    const w = d.width ?? 200
    const h = d.height ?? 60
    const rot = d.rotation
      ? `rotate(${d.rotation} ${x + w / 2} ${y + h / 2})`
      : undefined
    return (
      <g transform={rot}>
        <rect
          x={x} y={y} width={w} height={h}
          fill={d.fill || "#111827"}
          rx={4}
        />
        {d.label ? (
          <text
            x={x + w / 2}
            y={y + h / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(20, Math.max(12, h / 3))}
            fontWeight="bold"
            fill={d.color || "#FFFFFF"}
          >
            {d.label}
          </text>
        ) : null}
      </g>
    )
  }
  if (d.kind === "text") {
    return (
      <text
        x={x} y={y}
        fontSize={16}
        fontWeight="bold"
        fill={d.color || "#374151"}
      >
        {d.label || "LABEL"}
      </text>
    )
  }
  if (d.kind === "line") {
    return (
      <line
        x1={x} y1={y}
        x2={x + (d.width ?? 0)} y2={y + (d.height ?? 0)}
        stroke={d.color || "#374151"}
        strokeWidth={2}
      />
    )
  }
  return null
}

const SEAT_R = 11   // seat circle radius, in viewbox units
const HIT_R  = 16   // invisible hit-target radius (bigger tap area on mobile)

function VisualSeat({
  seat, isSelected, inFlight, otherTier, tierColor, onClick, onPointerEnter, onPointerLeave,
}: {
  seat: SeatMapSeat
  isSelected: boolean
  inFlight: boolean
  otherTier: boolean
  tierColor: string
  onClick: () => void
  onPointerEnter: () => void
  onPointerLeave: () => void
}) {
  const cx = seat.x as number
  const cy = seat.y as number
  const isAccessible = seat.seat_type === "accessible"
  const isBooked = seat.status === "booked"
  const isForeignHeld = seat.status === "held" && !isSelected
  const isUnavailable = seat.status === "disabled" || isBooked || isForeignHeld
  const isDisabled = isUnavailable || inFlight
  const lockedTier = !isSelected && otherTier && seat.status === "available"

  // TicketsMinistry-style palette: every available seat wears its tier color
  // as a solid dot; sold / held / disabled collapse to a single neutral gray
  // so the buyer reads them as "not pickable" at a glance. The user's own
  // pick keeps the tier color but gets a thick contrasting ring around it.
  // Stroke uses `currentColor` so it inherits the wrapping <g>'s color,
  // which we drive via Tailwind's `text-foreground` — that resolves to dark
  // on light mode and white on dark mode, so the selected ring is always
  // visible regardless of theme.
  let fill = tierColor || "#9CA3AF"
  let stroke = "transparent"
  let strokeWidth = 0
  if (isUnavailable) {
    fill = "#4B5563"               // gray-600 — sold / not available (dark grey)
  }
  if (isSelected) {
    // Black ring in both themes — the seatmap canvas is light in dark mode
    // too (white/40 backdrop), so a black outline reads cleanly on both.
    stroke = "#111827"
    strokeWidth = 2.5
  }

  const title = seat.ticket_type
    ? `${seat.seat_label || seat.seat_number} · ${seat.ticket_type.name} · LKR ${seat.ticket_type.price.toLocaleString()}${
        lockedTier ? " (different tier — click to switch)" : ""
      }`
    : (seat.seat_label || seat.seat_number)

  const rotation = seat.rotation
  const transform = rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined

  // Click handler is attached to the whole <g> so the invisible hit circle
  // also forwards taps. We swallow the click when disabled but still route
  // locked-tier clicks through so the parent's tier-switch banner fires.
  const handleClick = () => {
    if (isDisabled) return
    onClick()
  }

  return (
    <g
      transform={transform}
      onClick={handleClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
      opacity={lockedTier ? 0.4 : 1}
      // text-foreground drives `currentColor` for the selected seat ring,
      // so it auto-adapts to light vs dark mode.
      className={cn("text-foreground", inFlight && "animate-pulse")}
    >
      <title>{title}</title>
      {/* Hit target — invisible but pointer-receptive, sized larger than
          the visible square to give phones a comfortable tap radius. */}
      <rect
        x={cx - HIT_R} y={cy - HIT_R}
        width={HIT_R * 2} height={HIT_R * 2}
        fill="transparent"
      />
      <rect
        x={cx - SEAT_R} y={cy - SEAT_R}
        width={SEAT_R * 2} height={SEAT_R * 2}
        rx={3} ry={3}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* Accessibility seats keep an "H" glyph so they're still identifiable
          at a glance. Numbered glyphs were dropped in favour of tier-color
          fills — the seat label shows in the hover card instead. */}
      {isAccessible && (
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fill="#FFFFFF"
          pointerEvents="none"
        >
          H
        </text>
      )}
    </g>
  )
}

// Solid color dot for the tier-price swatches in the legend. Color is set
// inline because tier colors come from the runtime palette (TIER_PALETTE),
// not a Tailwind class.
function TierDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10 dark:ring-white/10"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  )
}

// Floating info card anchored above a hovered seat in visual mode. Mirrors
// the MyTickets pattern: CATEGORY / SEAT label, status, price.
function SeatHoverCard({
  seat,
  leftPct,
  topPct,
  tierIndex,
  isSelected,
}: {
  seat: SeatMapSeat
  leftPct: number
  topPct: number
  tierIndex: number
  isSelected: boolean
}) {
  const statusLabel = (() => {
    if (isSelected) return "Selected"
    if (seat.status === "booked") return "Sold"
    if (seat.status === "held" && !seat.held_by_me) return "On hold"
    if (seat.status === "disabled") return "Not for sale"
    return "Available"
  })()

  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[140px] -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
      role="tooltip"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {seat.ticket_type && (
          <TierDot color={tierColorByIndex(tierIndex)} />
        )}
        <span>{seat.ticket_type?.name ?? "Reserved"}</span>
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">
        {seat.seat_label || seat.seat_number}
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{statusLabel}</span>
        {seat.ticket_type && (
          <span className="font-medium text-foreground">
            LKR {seat.ticket_type.price.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}

function formatRelative(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}

interface ZoomControlsProps {
  zoom: number
  min: number
  max: number
  onIn:    () => void
  onOut:   () => void
  onReset: () => void
}

export function ZoomControls({ zoom, min, max, onIn, onOut, onReset }: ZoomControlsProps) {
  const btn = "inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-sm dark:bg-card/40">
      <button type="button" onClick={onOut} disabled={zoom <= min} aria-label="Zoom out" className={btn}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-10 text-center text-[11px] font-medium tabular-nums text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" onClick={onIn} disabled={zoom >= max} aria-label="Zoom in" className={btn}>
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onReset} disabled={zoom === 1} aria-label="Reset zoom" className={btn}>
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
