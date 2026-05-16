"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, UserPlus, X } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type StrengthTier = 0 | 1 | 2 | 3 | 4 | 5

const STRENGTH_META: Record<StrengthTier, { label: string; barClass: string; textClass: string }> = {
  0: { label: "Too short", barClass: "bg-destructive", textClass: "text-destructive" },
  1: { label: "Weak", barClass: "bg-destructive", textClass: "text-destructive" },
  2: { label: "Fair", barClass: "bg-amber-500", textClass: "text-amber-600 dark:text-amber-400" },
  3: { label: "Good", barClass: "bg-primary", textClass: "text-primary" },
  4: { label: "Strong", barClass: "bg-emerald-500", textClass: "text-emerald-600 dark:text-emerald-400" },
  5: { label: "Excellent", barClass: "bg-emerald-500", textClass: "text-emerald-600 dark:text-emerald-400" },
}

function scorePassword(pwd: string): StrengthTier {
  let n = 0
  if (pwd.length >= 6) n++
  if (pwd.length >= 10) n++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) n++
  if (/[0-9]/.test(pwd)) n++
  if (/[^a-zA-Z0-9]/.test(pwd)) n++
  return Math.min(5, n) as StrengthTier
}

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()

  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const strength = scorePassword(password)
  const meta = STRENGTH_META[strength]
  const passwordsMatch = confirm.length > 0 && password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    const result = await register(name, email, password)
    if (result.success) {
      if (typeof window !== "undefined") {
        localStorage.setItem("pendingVerificationEmail", email)
      }
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } else {
      setError(result.error || "Registration failed. Please try again.")
    }
    setLoading(false)
  }

  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 dark:opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(50% 50% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%)",
        }}
      />

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/Images/logo.png"
              alt="MyScope"
              width={200}
              height={72}
              className="h-20 w-auto"
            />
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover and book the best live experiences in Sri Lanka.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">Full name</label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Akila Perera"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email address</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  required
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= strength ? meta.barClass : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <div className={cn("text-xs font-medium", meta.textClass)}>
                    Password strength: {meta.label}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  required
                  className="pr-9"
                />
                {confirm.length > 0 && (
                  <span
                    className={cn(
                      "absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full",
                      passwordsMatch
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive",
                    )}
                    aria-label={passwordsMatch ? "Passwords match" : "Passwords don't match"}
                  >
                    {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              By creating an account you agree to MyScope&rsquo;s{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              <UserPlus />
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </div>
  )
}
