"use client"

// Shared "Danger zone — Resign as organizer" block. Lives on both the
// organizer dashboard and the organizer profile page so the action is
// reachable from either entry point but the visual treatment + preflight
// logic only exists in one file.
//
// Visual style: solid destructive header bar, double-thick destructive border
// across the whole block, and a soft red shadow so the section reads as a
// warning at a glance (GitHub-style danger zone).

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader, LogOut, ShieldAlert } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Blocker {
  type: string
  message: string
  detail?: string
  count?: number
  amount?: number
}

export function ResignDangerZone() {
  const router = useRouter()
  const { logout } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  const [blockers, setBlockers] = React.useState<Blocker[] | null>(null)
  const [error, setError] = React.useState("")
  const [confirming, setConfirming] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const handleOpen = async () => {
    setOpen(true)
    setError("")
    setConfirming(false)
    setBlockers(null)
    setChecking(true)
    try {
      const res = await fetch(`${API_URL}/api/organizers/me/can-resign`, {
        credentials: "include",
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.message || "Couldn't run the check.")
        return
      }
      setBlockers((data.data.blockers || []) as Blocker[])
    } catch {
      setError("Network error.")
    } finally {
      setChecking(false)
    }
  }

  const handleResign = async () => {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`${API_URL}/api/organizers/me/resign`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!data?.success) {
        // If the server returned a fresh blockers list (e.g. something changed
        // between preflight and confirm), surface it instead of a flat error.
        if (data?.data?.blockers) {
          setBlockers(data.data.blockers as Blocker[])
          setConfirming(false)
        }
        setError(data?.message || "Failed to resign.")
        return
      }
      // Role just flipped server-side; nuke the local session so RBAC reads
      // the fresh role on next page load.
      try {
        await logout()
      } catch {
        /* logout is best-effort — push anyway */
      }
      router.push("/?resigned=1")
    } catch {
      setError("Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  const canResign = !checking && (blockers?.length ?? 0) === 0 && !error

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-destructive bg-destructive/5 shadow-[0_0_0_1px_rgba(220,38,38,0.15),0_8px_24px_-12px_rgba(220,38,38,0.45)]">
      {/* Solid destructive header band */}
      <div className="flex items-center gap-2 bg-destructive px-5 py-3 text-destructive-foreground">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <h2 className="text-sm font-bold uppercase tracking-widest">Danger zone</h2>
      </div>
      <div className="border-b-2 border-destructive/30 bg-destructive/[0.06] px-5 py-3">
        <p className="text-xs font-medium text-destructive">
          Permanent actions. Read carefully before proceeding — these can&rsquo;t be undone from here.
        </p>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-destructive">Resign as organizer</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Step down from your organizer role. Past events stay public, but you won&rsquo;t be
            able to create or edit events. You can re-apply later.
          </p>
        </div>
        {!open && (
          <Button
            type="button"
            size="sm"
            onClick={handleOpen}
            className="shrink-0 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
          >
            <LogOut className="h-3.5 w-3.5" />
            Resign…
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t-2 border-destructive/30 bg-destructive/[0.05] p-5">
          {checking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
              Checking your account…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!checking && blockers && blockers.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Resolve these before you can resign:
              </p>
              <ul className="space-y-2">
                {blockers.map((b) => (
                  <li
                    key={b.type}
                    className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{b.message}</div>
                      {b.detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{b.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!checking && canResign && !confirming && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              All clear — no blockers found. You can resign.
            </div>
          )}

          {/* Confirmation prompt — explicit second step so a misclick can't trigger it */}
          {confirming && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              This will revoke your organizer access immediately and sign you out. Continue?
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                setConfirming(false)
                setError("")
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            {confirming ? (
              <Button
                type="button"
                size="sm"
                onClick={handleResign}
                disabled={submitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {submitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                {submitting ? "Resigning…" : "Yes, resign"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setConfirming(true)}
                disabled={!canResign || submitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                Resign as organizer
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
