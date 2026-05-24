"use client"

import * as React from "react"
import { AlertCircle, Check, LayoutGrid, Plus, Tag, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SeatGridPreview, type LayoutData } from "@/components/events/seat-grid-preview"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface TicketLite { id: string; name: string; price: number }
interface Built { layout_data: LayoutData; stage_position: string; total_seats: number }

// ---------------------------------------------------------------------------
// EditSeatMap — build or replace a reserved event's seat map with a square/grid
// layout. Seats are generated straight onto the event via POST /seat-grid; no
// reusable venue_layout is saved. Used for organizer-built ("grid") events —
// admin-built ("custom") events are shown read-only by the edit page instead.
// Ticket types already exist, so section → ticket mapping uses real UUIDs.
// ---------------------------------------------------------------------------
export function EditSeatMap({
  eventId,
  ticketTypes,
  currentSeats,
  onApplied,
}: {
  eventId: string
  ticketTypes: TicketLite[]
  currentSeats: LayoutData | null
  onApplied: () => void
}) {
  const hasSeats = !!currentSeats && currentSeats.sections.length > 0
  const [open, setOpen] = React.useState(!hasSeats)
  const [built, setBuilt] = React.useState<Built | null>(null)
  const [sectionMap, setSectionMap] = React.useState<Record<string, string>>({})
  const [err, setErr] = React.useState("")
  const [applying, setApplying] = React.useState(false)

  const handleBuild = (layout: Built | null) => {
    setBuilt(layout)
    // Drop mappings for sections that no longer exist after a rebuild.
    if (layout) {
      setSectionMap((prev) => {
        const names = new Set(layout.layout_data.sections.map((s) => s.name))
        const next: Record<string, string> = {}
        for (const [k, v] of Object.entries(prev)) if (names.has(k)) next[k] = v
        return next
      })
    } else {
      setSectionMap({})
    }
  }

  const apply = async () => {
    if (!built || built.total_seats === 0) { setErr("Build a seat map first."); return }
    const unmapped = built.layout_data.sections.filter((s) => !sectionMap[s.name])
    if (unmapped.length) {
      setErr(`Assign a ticket type to section(s): ${unmapped.map((s) => s.name).join(", ")}.`)
      return
    }
    setApplying(true)
    setErr("")
    try {
      const r = await fetch(`${API_URL}/api/organizer/events/${eventId}/seat-grid`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout_data: built.layout_data, section_ticket_map: sectionMap }),
      })
      const d = await r.json()
      if (!d?.success) { setErr(d?.message || "Failed to apply seat map."); return }
      setBuilt(null)
      setSectionMap({})
      setOpen(false)
      onApplied()
    } catch {
      setErr("Network error applying seat map.")
    } finally {
      setApplying(false)
    }
  }

  // ---- Current map + entry point ----
  if (!open) {
    return (
      <div className="space-y-3">
        {hasSeats && (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-3">
            <SeatGridPreview layout={currentSeats!} />
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {hasSeats ? "Replace seat map" : "Build seat map"}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!hasSeats && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This reserved event has no seats yet, so attendees can&rsquo;t book. Build a grid, map each section to a ticket type, then apply.</span>
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <GridBuilder onBuild={handleBuild} />

      {/* Section -> ticket mapping for the built grid */}
      {built && built.total_seats > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Assign pricing to each section</h3>
          </div>
          <div className="space-y-2.5">
            {built.layout_data.sections.map((section) => (
              <div key={section.id} className="flex flex-wrap items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded" style={{ background: section.color || "var(--muted)" }} aria-hidden />
                <span className="w-32 shrink-0 text-sm font-medium text-foreground">{section.name}</span>
                <select
                  aria-label={`Ticket type for section ${section.name}`}
                  value={sectionMap[section.name] ?? ""}
                  onChange={(e) => setSectionMap((m) => ({ ...m, [section.name]: e.target.value }))}
                  className="h-9 flex-1 min-w-[200px] rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <option value="">Pick a ticket type…</option>
                  {ticketTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.price != null && ` — LKR ${Number(t.price).toLocaleString()}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="button" size="sm" onClick={apply} disabled={applying || !built || built.total_seats === 0}>
          {applying ? "Applying…" : <><Check /> Apply seat map</>}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GridBuilder — section-based square/grid generator with a live preview. Builds
// layout_data in state and pushes it up via onBuild (no venue_layout is saved).
// ---------------------------------------------------------------------------
interface BuilderSection { name: string; color: string; rows: string; seatsPerRow: string; rowStart: string }
const BUILDER_COLORS = ["#7F77DD", "#1D9E75", "#BA7517", "#D85A30", "#185FA5", "#993556"]
const emptySection = (i: number): BuilderSection => ({
  name: i === 0 ? "Main Hall" : `Section ${i + 1}`,
  color: BUILDER_COLORS[i % BUILDER_COLORS.length],
  rows: "8",
  seatsPerRow: "20",
  rowStart: "A",
})
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function GridBuilder({ onBuild }: { onBuild: (layout: Built | null) => void }) {
  const [stagePosition, setStagePosition] = React.useState("front")
  const [sections, setSections] = React.useState<BuilderSection[]>([emptySection(0)])
  const [buildError, setBuildError] = React.useState("")

  const upd = (i: number, patch: Partial<BuilderSection>) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const totalSeats = sections.reduce((acc, s) => acc + (parseInt(s.rows, 10) || 0) * (parseInt(s.seatsPerRow, 10) || 0), 0)

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

  const buildLayoutData = React.useCallback((): LayoutData | { error: string } => {
    const out: LayoutData = { sections: [] }
    const used = new Set<string>()
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]
      const nm = s.name.trim()
      if (!nm) return { error: `Section #${i + 1}: name is required.` }
      if (used.has(nm)) return { error: `Duplicate section name "${nm}".` }
      used.add(nm)
      const rowCount = parseInt(s.rows, 10)
      const seatsPerRow = parseInt(s.seatsPerRow, 10)
      if (!Number.isInteger(rowCount) || rowCount <= 0) return { error: `Section "${nm}": rows must be a positive integer.` }
      if (!Number.isInteger(seatsPerRow) || seatsPerRow <= 0) return { error: `Section "${nm}": seats per row must be a positive integer.` }
      const startIdx = ALPHA.indexOf((s.rowStart || "A").trim().toUpperCase().charAt(0))
      if (startIdx < 0) return { error: `Section "${nm}": start row must be A–Z.` }
      if (startIdx + rowCount > 26) return { error: `Section "${nm}": rows would extend past Z.` }
      out.sections.push({
        id: `s${i + 1}`,
        name: nm,
        color: s.color,
        rows: Array.from({ length: rowCount }, (_, r) => ({
          label: ALPHA[startIdx + r],
          seats: Array.from({ length: seatsPerRow }, (_, j) => ({ number: String(j + 1), type: "standard" })),
        })),
      })
    }
    return out
  }, [sections])

  // Push the built layout up whenever geometry/stage change. A ref keeps the
  // parent callback out of the dep array so we don't loop on parent re-renders.
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
    const total = data.sections.reduce((acc, sec) => acc + sec.rows.reduce((r, row) => r + row.seats.length, 0), 0)
    onBuildRef.current({ layout_data: data, stage_position: stagePosition, total_seats: total })
  }, [buildLayoutData, stagePosition, totalSeats])

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Stage</label>
          <select
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
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section #{i + 1}</span>
              {sections.length > 1 && (
                <button type="button" onClick={() => setSections((p) => p.filter((_, idx) => idx !== i))} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10" aria-label="Remove section">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Section name</label>
                <Input value={s.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="VIP, Balcony…" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Colour</label>
                <div className="flex items-center gap-1.5">
                  {BUILDER_COLORS.map((c) => (
                    <button key={c} type="button" aria-label={`Pick colour ${c}`} onClick={() => upd(i, { color: c })} className={cn("h-7 w-7 rounded-md border-2 transition-transform", s.color === c ? "scale-110 border-foreground" : "border-transparent")} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Rows</label>
                <Input type="number" min={1} max={26} value={s.rows} onChange={(e) => upd(i, { rows: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Seats per row</label>
                <Input type="number" min={1} max={100} value={s.seatsPerRow} onChange={(e) => upd(i, { seatsPerRow: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Start row letter</label>
                <Input maxLength={1} value={s.rowStart} onChange={(e) => upd(i, { rowStart: e.target.value.toUpperCase() })} placeholder="A" />
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

      {/* Live preview */}
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <div className="mb-2 flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</span>
        </div>
        {totalSeats > 0 ? <SeatGridPreview layout={previewData} stagePosition={stagePosition} /> : (
          <p className="py-4 text-center text-xs text-muted-foreground">Enter rows and seats to see your seat map.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">≈ {totalSeats.toLocaleString()} seats</div>
        <Button type="button" variant="outline" size="sm" onClick={() => setSections((p) => [...p, emptySection(p.length)])}><Plus /> Add section</Button>
      </div>
    </div>
  )
}
