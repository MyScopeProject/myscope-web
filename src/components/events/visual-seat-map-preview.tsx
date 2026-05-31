"use client"

import * as React from "react"

// Read-only preview of a visual seat map. Mirrors the interactive renderer in
// seat-map-picker.tsx but without click handlers, selection, or holds — it's
// just an SVG snapshot so the organizer can confirm what their admin-built
// map looks like before going live.
//
// Accepts the same shape the GET /api/organizer/events/:id/seat-map endpoint
// returns. Caller is responsible for falling back to a grid preview when
// seats lack (x, y).

export interface VisualPreviewDecor {
  id?: string
  kind: "rect" | "text" | "line"
  x?: number | null
  y?: number | null
  width?: number | null
  height?: number | null
  rotation?: number | null
  label?: string | null
  fill?: string | null
  color?: string | null
}

export interface VisualPreviewSeat {
  id: string
  section: string | null
  row_label: string | null
  seat_number: string | number | null
  seat_label: string | null
  seat_type: "standard" | "accessible" | "restricted_view" | "aisle" | null
  status: "available" | "held" | "booked" | "disabled"
  x: number | null
  y: number | null
  rotation: number | null
}

// Per-(section, row) extents — used to draw row letter labels at the edges
// of each row in each section (mirrors the reference seating layout where
// every section block shows its row letters on both sides).
interface RowExtent {
  section: string
  row_label: string
  minX: number
  maxX: number
  y: number
}
function computeRowExtents(seats: VisualPreviewSeat[]): RowExtent[] {
  const map = new Map<string, RowExtent>()
  for (const s of seats) {
    if (s.x == null || s.y == null || !s.row_label) continue
    const key = `${s.section ?? ""}|${s.row_label}`
    const cur = map.get(key)
    if (cur) {
      if (s.x < cur.minX) cur.minX = s.x
      if (s.x > cur.maxX) cur.maxX = s.x
      cur.y = (cur.y + s.y) / 2
    } else {
      map.set(key, { section: s.section ?? "", row_label: s.row_label, minX: s.x, maxX: s.x, y: s.y })
    }
  }
  return Array.from(map.values())
}

export interface VisualPreviewLayout {
  viewbox_width: number
  viewbox_height: number
  background_image_url: string | null
  decor: VisualPreviewDecor[]
}

interface Props {
  layout: VisualPreviewLayout
  seats: VisualPreviewSeat[]
  className?: string
  // Caps height so the SVG doesn't dominate the page; defaults to a sensible
  // value but callers can override (e.g. modal vs sidebar).
  maxHeightClass?: string
}

const SEAT_R = 11
const ROW_LABEL_GAP = 14

export function VisualSeatMapPreview({
  layout, seats, className, maxHeightClass = "max-h-[55vh]",
}: Props) {
  const vbW = Number(layout.viewbox_width)  || 1600
  const vbH = Number(layout.viewbox_height) || 1200
  const rowExtents = computeRowExtents(seats)
  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Seat map preview"
      className={[
        "block w-full rounded-md border border-border bg-card",
        maxHeightClass,
        className ?? "",
      ].join(" ")}
    >
      {layout.background_image_url && (
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
      {/* Row letter labels at the left + right of each row, per section. */}
      {rowExtents.map(r => (
        <g key={`row-${r.section}-${r.row_label}`} aria-hidden="true">
          <text
            x={r.minX - SEAT_R - ROW_LABEL_GAP}
            y={r.y}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={11}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="600"
            fill="#6B7280"
          >
            {r.row_label}
          </text>
          <text
            x={r.maxX + SEAT_R + ROW_LABEL_GAP}
            y={r.y}
            textAnchor="start"
            dominantBaseline="central"
            fontSize={11}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="600"
            fill="#6B7280"
          >
            {r.row_label}
          </text>
        </g>
      ))}
      {seats.map(s => {
        if (s.x == null || s.y == null) return null
        return <PreviewSeat key={s.id} seat={s} />
      })}
    </svg>
  )
}

function DecorShape({ d }: { d: VisualPreviewDecor }) {
  const x = Number(d.x ?? 0)
  const y = Number(d.y ?? 0)
  if (d.kind === "rect") {
    const w = Number(d.width  ?? 200)
    const h = Number(d.height ?? 60)
    const rot = d.rotation
      ? `rotate(${d.rotation} ${x + w / 2} ${y + h / 2})`
      : undefined
    return (
      <g transform={rot}>
        <rect x={x} y={y} width={w} height={h} fill={d.fill || "#111827"} rx={4} />
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
      <text x={x} y={y} fontSize={16} fontWeight="bold" fill={d.color || "#374151"}>
        {d.label || "LABEL"}
      </text>
    )
  }
  if (d.kind === "line") {
    return (
      <line
        x1={x} y1={y}
        x2={x + Number(d.width ?? 0)} y2={y + Number(d.height ?? 0)}
        stroke={d.color || "#374151"}
        strokeWidth={2}
      />
    )
  }
  return null
}

function PreviewSeat({ seat }: { seat: VisualPreviewSeat }) {
  const cx = seat.x as number
  const cy = seat.y as number
  const isAccessible = seat.seat_type === "accessible"
  const isBooked = seat.status === "booked"
  const isHeld   = seat.status === "held"

  // Status-driven palette matches the picker's color scheme so the organizer
  // sees seats colored the same way buyers will.
  let fill     = "#D1FAE5"        // emerald-100 — available
  let stroke   = "#10B981"
  let textFill = "#065F46"
  if (isAccessible)            { fill = "#DBEAFE"; stroke = "#3B82F6"; textFill = "#1E40AF" }
  if (seat.seat_type === "restricted_view") { fill = "#F3F4F6"; stroke = "#6B7280"; textFill = "#374151" }
  if (seat.status === "disabled")           { fill = "#E5E7EB"; stroke = "#9CA3AF"; textFill = "#6B7280" }
  if (isHeld)                  { fill = "#FEF3C7"; stroke = "#F59E0B"; textFill = "#92400E" }
  if (isBooked)                { fill = "#FECACA"; stroke = "#EF4444"; textFill = "#991B1B" }

  const rot = seat.rotation
  const transform = rot ? `rotate(${rot} ${cx} ${cy})` : undefined
  return (
    <g transform={transform}>
      <circle cx={cx} cy={cy} r={SEAT_R} fill={fill} stroke={stroke} strokeWidth={1.25} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill={textFill}
        pointerEvents="none"
      >
        {isAccessible ? "H" : (seat.seat_number ?? "")}
      </text>
    </g>
  )
}
