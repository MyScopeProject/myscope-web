"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

const ORGANIZER_ROLES = ["organizer", "superadmin"]

/**
 * Auth + role guard for every page under /organizer. Centralizes what used
 * to be duplicated in each of the 13 organizer pages, and is host-aware so
 * it redirects correctly whether the page is reached at myscope.lk/organizer/*
 * or organizer.myscope.lk/* (same deployment, see middleware.ts).
 *
 * `redirectPath` is the current page's own /organizer/... path, used to send
 * the user back here after logging in (main-host case only — the subdomain's
 * login always returns to /organizer since there's nothing else to land on).
 */
export function useOrganizerGuard(redirectPath: string) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const isOrganizerHost =
      typeof window !== "undefined" && window.location.hostname.startsWith("organizer.")

    if (!user) {
      if (isOrganizerHost) {
        router.replace("/login")
      } else {
        router.replace(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`)
      }
      return
    }

    if (!ORGANIZER_ROLES.includes(user.role || "")) {
      if (isOrganizerHost) {
        // The application/onboarding flow for prospective organizers lives on
        // the main consumer site, not this subdomain — cross-host, so a hard
        // navigation rather than router.replace().
        window.location.href = "https://www.myscope.lk/become-organizer"
      } else {
        router.replace("/become-organizer")
      }
    }
  }, [loading, user, router, redirectPath])

  return { user, loading }
}
