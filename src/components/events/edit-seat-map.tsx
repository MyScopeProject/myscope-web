"use client"

import * as React from "react"
import { AlertCircle, Check, LayoutGrid, Loader, Plus, Tag, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SeatGridPreview, type LayoutData } from "@/components/events/seat-grid-preview"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface LayoutSummary {
  id: string
  name: string
  description: string | null
  total_seats: number
  is_template: boolean
  stage_position: string
  layout_data?: LayoutData
}
interface LayoutDetail extends LayoutSummary {
  layout_data: LayoutData
}
interface TicketLite { id: string; name: string; price: number }

// ---------------------------------------------------------------------------
// EditSeatMap — apply / replace the seat map of an EXISTING reserved event.
// Repairs events whose seats never generated, and lets organizers swap layouts.
// Uses real ticket_type ids (the event's tickets are already persisted), so no
// name-resolution step like the create wizard needs.
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
  const [mode, setMode] = React.useState<"pick" | "grid">("pick")
  const [layouts, setLayouts] = React.useState<LayoutSummary[]>([])
  const [loadingList, setLoadingList] = React.useState(true)
  const [picked, setPicked] = React.useState<LayoutDetail | null>(null)
  const [pickedId, setPickedId] = React.useState<string | null>(null)
  const [sectionMap, setSectionMap] = React.useState<Record<string, string>>({})
  const [err, setErr] = React.useState("")
  const [applying, setApplying] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setLoadingList(true)
    setErr("")
    try {
      const r = await fetch(`${API_URL}/api/venue-layouts`, { credentials: "include" })
      const d = await r.json()
      if (!d?.success) { setErr(d?.message || "Couldn't load layouts."); return }
      setLayouts(d.data.layouts || [])
    } catch {
      setErr("Network error loading layouts.")
    } finally {
      setLoadingList(false)
    }
  }, [])

  React.useEffect(() => { if (open) refresh() }, [open, refresh])

  const pick = async (id: string) => {
    setErr("")
    try {
      const r = await fetch(`${API_URL}/api/venue-layouts/${id}`, { credentials: "include" })
      const d = await r.json()
      if (!d?.success) { setErr(d?.message || "Couldn't load that layout."); return }
      const detail = d.data.layout as LayoutDetail
      setPicked(detail)
      setPickedId(id)
      // Pre-map sections whose name matches a ticket tier.
      const m: Record<string, string> = {}
      for (const s of detail.layout_data.sections) {
        const t = ticketTypes.find((t) => t.name.trim().toLowerCase() === s.name.trim().toLowerCase())
        if (t) m[s.name] = t.id
      }
      setSectionMap(m)
    } catch {
      setErr("Network error loading layout.")
    }
  }

  // A freshly built grid is saved as a layout, then auto-picked for mapping.
  const onGridSaved = (created: LayoutSummary) => {
    setMode("pick")
    refresh().then(() => pick(created.id))
  }

  const apply = async () => {
    if (!picked || !pickedId) return
    const unmapped = picked.layout_data.sections.filter((s) => !sectionMap[s.name])
    if (unmapped.length) {
      setErr(`Assign a ticket type to section(s): ${unmapped.map((s) => s.name).join(", ")}.`)
      return
    }
    setApplying(true)
    setErr("")
    try {
      const r = await fetch(`${API_URL}/api/venue-layouts/${pickedId}/apply-to-event`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, section_ticket_map: sectionMap }),
      })
      const d = await r.json()
      if (!d?.success) { setErr(d?.message || "Failed to apply seat map."); return }
      setPicked(null)
      setPickedId(null)
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
          {hasSeats ? "Replace seat map" : "Set up seat map"}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!hasSeats && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This reserved event has no seats yet, so attendees can&rsquo;t book. Pick a layout or build a grid, map each section to a ticket type, then apply.</span>
        </div>
      )}

      {/* Mode switch */}
      <div className="grid grid-cols-2 gap-2">
        {([["pick", "Pick a layout", LayoutGrid], ["grid", "Build a grid", Plus]] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setPicked(null); setPickedId(null) }}
            className={cn(
              "flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition-colors",
              mode === m ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40",
            )}
          >
            <Icon className={cn("h-4 w-4", mode === m ? "text-primary" : "text-muted-foreground")} />
            {label}
          </button>
        ))}
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* PICK */}
      {mode === "pick" && !picked && (
        loadingList ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader className="h-5 w-5 animate-spin" /></div>
        ) : layouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No saved layouts or templates. Switch to{" "}
            <button type="button" onClick={() => setMode("grid")} className="font-medium text-primary hover:underline">Build a grid</button>.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {layouts.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => pick(l.id)}
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{l.name}</span>
                  {l.is_template && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">Template</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{l.total_seats} seats</div>
                {l.layout_data && l.layout_data.sections?.length > 0 && (
                  <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-2">
                    <SeatGridPreview layout={l.layout_data} stagePosition={l.stage_position} compact />
                  </div>
                )}
              </button>
            ))}
          </div>
        )
      )}

      {/* GRID builder */}
      {mode === "grid" && !picked && (
        <GridBuilder onSaved={onGridSaved} onError={setErr} />
      )}

      {/* Section -> ticket mapping for the chosen layout */}
      {picked && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-3">
            <SeatGridPreview layout={picked.layout_data} stagePosition={picked.stage_position} />
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Assign pricing to each section</h3>
            </div>
            <div className="space-y-2.5">
              {picked.layout_data.sections.map((section) => (
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setPicked(null); setPickedId(null) }}>Back</Button>
            <Button type="button" size="sm" onClick={apply} disabled={applying}>
              {applying ? "Applying…" : <><Check /> Apply seat map</>}
            </Button>
          </div>
        </div>
      )}

      {!picked && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GridBuilder — section-based rectangular generator with a live preview.
// Saves a venue_layout, then hands the id back so the parent can map + apply.
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

function GridBuilder({ onSaved, onError }: { onSaved: (l: LayoutSummary) => void; onError: (m: string) => void }) {
  const [name, setName] = React.useState("")
  const [stagePosition, setStagePosition] = React.useState("front")
  const [sections, setSections] = React.useState<BuilderSection[]>([emptySection(0)])
  const [saving, setSaving] = React.useState(false)

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

  const buildLayoutData = (): LayoutData | { error: string } => {
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
  }

  const save = async () => {
    if (!name.trim()) { onError("Layout name is required."); return }
    const built = buildLayoutData()
    if ("error" in built) { onError(built.error); return }
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/api/venue-layouts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), stage_position: stagePosition, layout_data: built }),
      })
      const d = await r.json()
      if (!d?.success) { onError(d?.message || "Failed to save layout."); return }
      onSaved(d.data.layout as LayoutSummary)
    } catch {
      onError("Network error saving layout.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="text-sm font-medium text-foreground">Layout name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Conference Hall" />
        </div>
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
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSections((p) => [...p, emptySection(p.length)])}><Plus /> Add section</Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & continue"}</Button>
        </div>
      </div>
    </div>
  )
}
