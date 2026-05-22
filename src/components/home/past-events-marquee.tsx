"use client"

import * as React from "react"
import Link from "next/link"

export interface PastEventItem {
  id: string
  image_url: string
  title: string | null
  link_url: string | null
}

// Auto-scrolling, infinite strip of past-event photos that is ALSO a native
// horizontal scroller — users can swipe / drag / wheel through it. The items
// render twice; a requestAnimationFrame loop nudges scrollLeft and wraps at the
// start of the second copy for a seamless loop. Auto-scroll pauses while the
// user interacts, and is disabled under prefers-reduced-motion.
export function PastEventsMarquee({ items }: { items: PastEventItem[] }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const pausedRef = React.useRef(false)
  const count = items?.length ?? 0

  React.useEffect(() => {
    const el = scrollerRef.current
    if (!el || count === 0) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    // Exact loop distance = offset of the first duplicated card. Using the DOM
    // offset (not scrollWidth/2) keeps the wrap seamless regardless of gaps.
    let loopWidth = 0
    const measure = () => {
      const first = el.children[0] as HTMLElement | undefined
      const firstDup = el.children[count] as HTMLElement | undefined
      loopWidth = first && firstDup ? firstDup.offsetLeft - first.offsetLeft : el.scrollWidth / 2
    }
    measure()
    window.addEventListener("resize", measure)

    const SPEED = 0.5 // px per frame (~30px/s at 60fps)
    let raf = 0
    const tick = () => {
      if (!pausedRef.current && loopWidth > 0) {
        el.scrollLeft += SPEED
        if (el.scrollLeft >= loopWidth) el.scrollLeft -= loopWidth
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", measure)
    }
  }, [count])

  if (count === 0) return null

  // Duplicate the list so the wrap has a second copy to land on.
  const doubled = [...items, ...items]
  const pause = () => {
    pausedRef.current = true
  }
  const resume = () => {
    pausedRef.current = false
  }

  return (
    <div className="relative">
      {/* Edge fades so cards slide in/out softly instead of clipping hard. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-background to-transparent" />

      <div
        ref={scrollerRef}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        className="flex gap-4 overflow-x-auto px-4 pb-1 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {doubled.map((item, i) => (
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
