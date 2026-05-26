import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Small orientation strip for the multi-page event checkout flow:
 *   Step 1 — Choose (pick a ticket on /events/[id]/checkout)
 *   Step 2 — Details (attendee info on the same page)
 *   Step 3 — Pay     (payment screen on /bookings/event/[id])
 *
 * Static by design — driven by `activeIndex` from the caller, not scroll
 * position — because the steps live across two separate routes. Visual
 * states match the registration wizard on /become-organizer.
 */
export const CHECKOUT_STEPS = ["Choose", "Details", "Pay"] as const

export type CheckoutStepIndex = 0 | 1 | 2

export function CheckoutSteps({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm">
      {CHECKOUT_STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <li className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs",
                i === activeIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : i < activeIndex
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                i === activeIndex ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
          {i < CHECKOUT_STEPS.length - 1 && (
            <li className="h-px w-6 flex-none bg-border sm:w-12" aria-hidden />
          )}
        </React.Fragment>
      ))}
    </ol>
  )
}
