"use client"

import * as React from "react"
import { BadgeCheck, Check, Loader, Pencil, Phone, ShieldAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ViewRow } from "@/components/profile/editable-card"
import toast from "react-hot-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

/**
 * Profile phone number + one-time SMS verification. Once a number is verified
 * here, bookings that use the same number skip the per-booking OTP at checkout
 * (the API auto-marks event_bookings.phone_verified — see routes/checkout.js).
 *
 * Two-step edit flow, which is why this isn't a plain EditableCard:
 *   view → (pencil) → enter number → "Send code" → enter OTP → "Verify".
 *
 * `onVerified` should refresh the auth user (checkAuth) so the verified badge
 * and number update everywhere after a successful verify.
 */
export function PhoneVerifyCard({
  phone,
  phoneVerified,
  onVerified,
}: {
  phone?: string
  phoneVerified?: boolean
  onVerified: () => void | Promise<void>
}) {
  const [editing, setEditing] = React.useState(false)
  const [step, setStep] = React.useState<"enter" | "code">("enter")
  const [phoneInput, setPhoneInput] = React.useState(phone || "")
  const [otp, setOtp] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [sentTo, setSentTo] = React.useState("")

  const openEdit = () => {
    setPhoneInput(phone || "")
    setOtp("")
    setStep("enter")
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setStep("enter")
    setOtp("")
  }

  const sendCode = async () => {
    const value = phoneInput.trim()
    if (!value) {
      toast.error("Enter a phone number.")
      return
    }
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/user/phone/request-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value }),
      })
      const body = await res.json()
      if (body?.success) {
        setSentTo(body.data?.sent_to_last4 || value.slice(-4))
        setStep("code")
        toast.success("Verification code sent.")
      } else {
        toast.error(body?.message || "Couldn't send the code.")
      }
    } catch {
      toast.error("Network error sending the code.")
    } finally {
      setSending(false)
    }
  }

  const verify = async () => {
    const code = otp.trim()
    if (!code) {
      toast.error("Enter the code.")
      return
    }
    setVerifying(true)
    try {
      const res = await fetch(`${API_URL}/api/user/phone/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code }),
      })
      const body = await res.json()
      if (body?.success) {
        toast.success("Phone verified.")
        await onVerified()
        cancel()
      } else {
        toast.error(body?.message || "Verification failed.")
      }
    } catch {
      toast.error("Network error verifying the code.")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
      <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Phone className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground">Phone number</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Verify once here to skip the code at checkout.
            </p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={openEdit}
            aria-label="Edit phone number"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      <div className="px-6 py-5">
        {!editing ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ViewRow label="Number" value={phone} />
            {phone ? (
              phoneVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" /> Not verified
                </span>
              )
            ) : null}
          </div>
        ) : step === "enter" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="phone-input" className="block text-sm font-medium text-foreground">
                Mobile number
              </label>
              <input
                id="phone-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+94 77 123 4567"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
              />
              <p className="text-xs text-muted-foreground">
                We&rsquo;ll text a 6-digit code to confirm it&rsquo;s reachable.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={sending}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button type="button" size="sm" onClick={sendCode} disabled={sending}>
                {sending ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
                {sending ? "Sending…" : "Send code"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="otp-input" className="block text-sm font-medium text-foreground">
                Enter the code
              </label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                placeholder="123456"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm tracking-[0.3em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
              />
              <p className="text-xs text-muted-foreground">
                Sent to the number ending {sentTo}.{" "}
                <button type="button" onClick={() => setStep("enter")} className="text-primary hover:underline">
                  Change number
                </button>
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={verifying}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button type="button" size="sm" onClick={verify} disabled={verifying}>
                {verifying ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {verifying ? "Verifying…" : "Verify & save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
