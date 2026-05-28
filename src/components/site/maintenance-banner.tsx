"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

/**
 * Top-of-page banner shown when the admin Settings → Features →
 * Maintenance mode flag is on. Fetched lazily from the public endpoint
 * `/api/settings/maintenance`, with no auth and a 30s server-side cache.
 *
 * Intentionally non-dismissible: if we're saying "the platform is degraded",
 * the user should see it on every page until we flip the flag back off.
 *
 * Soft-fails to "no banner" on any error — better to under-warn than to
 * crash the whole site over a Settings table read.
 *
 * Mount in the root layout above the navbar so the banner sits at the very
 * top of the viewport on every route.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Re-poll cadence in ms. We accept a small lag between flipping the toggle
// in admin and visitors seeing the change (~1 min worst case on top of the
// 30s server cache). The cost of polling more aggressively isn't worth it.
const POLL_MS = 60_000

interface MaintenanceState {
  enabled: boolean
  message: string
}

export function MaintenanceBanner() {
  const [state, setState] = useState<MaintenanceState | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchState = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/maintenance`, {
          // Best-effort: don't carry cookies, this is a public read.
          credentials: "omit",
          // Browser-side cache hint matching the server's 30s s-maxage.
          cache: "default",
        })
        const json = await res.json()
        if (cancelled) return
        if (json?.success && json?.data) {
          setState({
            enabled: !!json.data.enabled,
            message: String(json.data.message || ""),
          })
        }
      } catch {
        // Soft-fail. Leave state as-is (or null on first load).
      }
    }

    fetchState()
    const id = setInterval(fetchState, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (!state?.enabled || !state.message) return null

  return (
    <div
      role="status"
      // Live region so screen readers announce the message when it changes.
      aria-live="polite"
      className="bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2 text-xs font-medium sm:px-6 sm:text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p className="flex-1 leading-snug">{state.message}</p>
      </div>
    </div>
  )
}
