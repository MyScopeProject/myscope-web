"use client"

import * as React from "react"
import Link from "next/link"

export interface PastEventItem {
  id: string
  image_url: string
  title: string | null
  link_url: string | null
}

// Continuously-scrolling, infinite strip of past-event photos that is ALSO a
// native horizontal scroller (swipe / drag / wheel). It never pauses.
//
// Robustness notes (why this isn't a plain CSS marquee):
//   - We auto-duplicate the items enough times to always overflow the viewport,
//     otherwise scrollLeft is pinned and nothing moves when there are few cards.
//   - We advance scrollLeft by a time-based INTEGER step (browsers round
//     scrollLeft to whole pixels — a 0.5px/frame nudge floors back to 0 and
//     looks frozen).
//   - We wrap with `% setWidth`; since every copy is identical the wrap is
//     visually seamless from any scroll position, including after a manual swipe.
export function PastEventsMarquee({ items }: { items: PastEventItem[] }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const count = items?.length ?? 0
  const [copies, setCopies] = React.useState(2)

  React.useEffect(() => {
    const el = scrollerRef.current
    if (!el || count === 0) return

    // Width of one original set (offset of the first duplicated card).
    const oneSetWidth = () => {
      const a = el.children[0] as HTMLElement | undefined
      const b = el.children[count] as HTMLElement | undefined
      return a && b ? b.offsetLeft - a.offsetLeft : 0
    }

    // Grow copies until the track is at least one viewport wider than a set, so
    // there's always real content under the viewport after a modulo-wrap.
    const ensureCopies = () => {
      const w = oneSetWidth()
      if (w <= 0) return false
      const need = Math.ceil(el.clientWidth / w) + 2
      if (copies < need) {
        setCopies(need)
        return true
      }
      return false
    }

    if (ensureCopies()) return // grew → effect re-runs with more copies
    window.addEventListener("resize", ensureCopies)

    const setW = oneSetWidth()
    if (setW <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => window.removeEventListener("resize", ensureCopies)
    }

    const SPEED = 0.03 // px per ms (~30px/s)
    let carry = 0
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      carry += (now - last) * SPEED
      last = now
      const step = Math.floor(carry)
      if (step > 0) {
        carry -= step
        el.scrollLeft = (el.scrollLeft + step) % setW
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", ensureCopies)
    }
  }, [count, copies])

  if (count === 0) return null

  const repeated = Array.from({ length: copies }, () => items).flat()

  return (
    <div className="relative">
      {/* Edge fades so cards slide in/out softly instead of clipping hard. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-background to-transparent" />

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto px-4 pb-1 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {repeated.map((item, i) => (
          <PastEventCard key={`${item.id}-${i}`} item={item} ariaHidden={i >= count} />
        ))}
      </div>
    </div>
  )
}

function PastEventCard({ item, ariaHidden }: { item: PastEventItem; ariaHidden: boolean }) {
  const card = (
    <div className="group/card relative aspect-square w-56 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:w-64">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image_url}
        alt={item.title || "Past event"}
        loading="lazy"
        draggable={false}
        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
      />
      {item.title && (
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3">
          <p className="line-clamp-1 text-sm font-semibold text-white">{item.title}</p>
        </div>
      )}
    </div>
  )

  // Duplicated cards are decorative — hide the clones from a11y/tab order.
  const wrapperProps = ariaHidden ? { "aria-hidden": true, tabIndex: -1 } : {}

  if (!item.link_url) {
    return <div {...wrapperProps}>{card}</div>
  }

  // Relative paths use the client router; absolute URLs open in a new tab.
  if (item.link_url.startsWith("/")) {
    return (
      <Link href={item.link_url} {...wrapperProps}>
        {card}
      </Link>
    )
  }
  return (
    <a href={item.link_url} target="_blank" rel="noopener noreferrer" {...wrapperProps}>
      {card}
    </a>
  )
}
