"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RevealOnScrollProps {
  children: React.ReactNode
  className?: string
  /** Delay (ms) before this element starts revealing. Use to stagger siblings. */
  delay?: number
  /** Visibility threshold (0-1). Defaults to 0.1 — most of the element offscreen
   *  still triggers the reveal, which feels right for tall sections. */
  threshold?: number
  /** Animate once and stop observing. Defaults true; flip to false for elements
   *  you want to re-animate every time they enter the viewport. */
  once?: boolean
}

/**
 * Wraps a block so it fades + lifts into view when scrolled near. Used to give
 * MyScope's home/list/detail pages a quiet motion rhythm without changing any
 * layout. Honours `prefers-reduced-motion` by skipping the animation entirely.
 *
 * No new keyframes — a plain Tailwind transition between the hidden and shown
 * states keeps the budget at zero new CSS.
 */
export function RevealOnScroll({
  children,
  className,
  delay = 0,
  threshold = 0.1,
  once = true,
}: RevealOnScrollProps) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    // Reduced-motion users get the final state immediately — no transition,
    // no observer, no jank.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) obs.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, once])

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  )
}
