"use client"

import * as React from "react"
import { Check, Loader, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * A profile section card that toggles between a read-only "view" and an inline
 * edit form — a pencil in the top-right corner enters edit mode; Save / Cancel
 * in the footer leave it. Used across both profile pages (consumer + organizer)
 * so every section behaves identically.
 *
 * The card owns the `editing` + `saving` UI state. The parent owns the actual
 * data + persistence:
 *   - `children(editing)` renders the read-only rows when `editing` is false
 *     and the form inputs when true.
 *   - `onSave` performs the request and resolves to `true` on success (card
 *     then leaves edit mode) or `false` on validation/network failure (card
 *     stays open so the user can fix + retry).
 *   - `onCancel` reverts the parent's draft state to the last-saved values.
 *
 * Because each card saves independently, parents should send only that
 * section's fields (the profile PATCH endpoints are partial — untouched fields
 * are left as-is), so editing two cards at once never cross-contaminates.
 */
export function EditableCard({
  title,
  description,
  icon: Icon,
  saveLabel = "Save",
  children,
  onSave,
  onCancel,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  saveLabel?: string
  children: (editing: boolean) => React.ReactNode
  onSave: () => Promise<boolean>
  onCancel?: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    let ok = false
    try {
      ok = await onSave()
    } finally {
      setSaving(false)
    }
    if (ok) setEditing(false)
  }

  const handleCancel = () => {
    onCancel?.()
    setEditing(false)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
      <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${title}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      <div className="px-6 py-5">{children(editing)}</div>

      {editing && (
        <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : saveLabel}
          </Button>
        </footer>
      )}
    </section>
  )
}

/**
 * Read-only label/value row for a card's view mode. Renders a muted em-dash
 * placeholder when the value is empty so the layout stays consistent.
 */
export function ViewRow({
  label,
  value,
  className,
}: {
  label: string
  value?: string | null
  className?: string
}) {
  const has = typeof value === "string" && value.trim().length > 0
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm text-foreground">
        {has ? value : <span className="text-muted-foreground/60">—</span>}
      </div>
    </div>
  )
}
