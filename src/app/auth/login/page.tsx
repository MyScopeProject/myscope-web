"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowRight, Eye, EyeOff, LogIn } from "lucide-react"
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/components/theme/theme-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams?.get("redirect") || "/dashboard"
  const { login, googleLogin } = useAuth()
  const { resolvedTheme } = useTheme()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      router.push(redirect)
    } else if (result.code === "EMAIL_NOT_VERIFIED") {
      if (typeof window !== "undefined") {
        localStorage.setItem("pendingVerificationEmail", email)
      }
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } else {
      setError(result.error || "Login failed. Please try again.")
    }
    setLoading(false)
  }

  const handleGoogleSuccess = async (cred: CredentialResponse) => {
    if (!cred.credential) {
      setError("Google didn't return a credential. Try again.")
      return
    }
    setError("")
    setLoading(true)
    const result = await googleLogin(cred.credential)
    if (result.success) {
      router.push(redirect)
    } else {
      setError(result.error || "Google login failed.")
    }
    setLoading(false)
  }

  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      {/* Background flourish */}
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
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your MyScope account.</p>
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
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
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              <LogIn />
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google login failed. Please try again.")}
              theme={resolvedTheme === "dark" ? "filled_black" : "outline"}
              size="large"
              width="320"
            />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&rsquo;t have an account?{" "}
          <Link href="/auth/register" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Sign up
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </div>
  )
}
