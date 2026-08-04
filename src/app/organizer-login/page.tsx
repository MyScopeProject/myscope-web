"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader } from "lucide-react"
import { useGoogleLogin } from "@react-oauth/google"
import { useAuth } from "@/context/AuthContext"
import { ThemeToggle } from "@/components/ui/theme-toggle"

// Served at organizer.myscope.lk/login (middleware.ts rewrites it here) — the
// dedicated entry point so organizers never need to visit the main site.
// Deliberately a sibling of /organizer, not nested under it, so it isn't
// wrapped in OrganizerShell's dashboard chrome.
//
// Same Google OAuth mechanism as /auth/login — no new auth flow. Always
// pushes to /organizer on success; if the account isn't an approved
// organizer, useOrganizerGuard (which runs once /organizer mounts) sends
// them to the main site's /become-organizer.

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58Z"/>
    </svg>
  )
}

export default function OrganizerLoginPage() {
  const router = useRouter()
  const { googleLoginWithAccessToken } = useAuth()

  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const signIn = useGoogleLogin({
    onSuccess: async ({ access_token }) => {
      setError("")
      setLoading(true)
      const result = await googleLoginWithAccessToken(access_token)
      if (result.success) {
        router.push("/organizer")
      } else {
        setError(result.error || "Google sign-in failed.")
        setLoading(false)
      }
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed. Try again.")
    },
  })

  return (
    // Transparent wrapper — the root layout's ambient beam background shows
    // through, same atmosphere as the rest of the site. No top bar here; just
    // a theme toggle in the corner since this standalone page has no other
    // access to one.
    <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">

        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/Images/logo.png"
            alt="MyScope"
            width={160}
            height={48}
            className="h-12 w-auto"
            priority
          />
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Organizer
          </span>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your organizer workspace</p>
        </div>

        <div className="rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-8 shadow-sm dark:ring-1 dark:ring-white/10">

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => signIn()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted/60 disabled:opacity-60"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          <div className="my-6 border-t border-border" />

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Not an organizer yet?{" "}
            <a
              href="https://www.myscope.lk/become-organizer"
              className="text-foreground underline underline-offset-2 hover:text-primary"
            >
              Apply on myscope.lk
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
