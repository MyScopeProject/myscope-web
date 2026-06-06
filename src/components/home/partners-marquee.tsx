"use client"

import * as React from "react"
import Link from "next/link"

export interface PartnerItem {
  id: string
  image_url: string
  name: string | null
  website_url: string | null
}

// Single calm strip of partner logos scrolling leftward. Uses the same
// time-based scroll engine as PastEventsMarquee (integer steps +
// auto-duplication for seamless wrap).
export function PartnersMarquee({ items }: { items: PartnerItem[] }) {
  if (!items?.length) return null

  return (
    <div className="partners-strip relative">
      <MarqueeRow items={items} />

      <style jsx>{`
        /* Many partner PNGs are uploaded with a non-transparent background
           (white in light mode, black/dark in dark mode). mix-blend-mode
           multiplies/lightens the image against the page so those flat
           background pixels effectively drop out without us needing to
           re-export every logo as a transparent PNG.

           Light mode (white-ish page): multiply makes white → transparent,
           keeping the dark glyph. Dark mode (dark violet page): lighten
           makes black → transparent, keeping the bright glyph. */
        :global(:root.light) .partners-strip :global(.partner-logo) {
          mix-blend-mode: multiply;
          filter: none;
        }
        :global(:root.dark) .partners-strip :global(.partner-logo),
        :global(html:not(.light)) .partners-strip :global(.partner-logo) {
          mix-blend-mode: lighten;
          filter: none;
        }
      `}</style>
    </div>
  )
}

function MarqueeRow({ items }: { items: PartnerItem[] }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const count = items?.length ?? 0
  const [copies, setCopies] = React.useState(2)

  React.useEffect(() => {
    const el = scrollerRef.current
    if (!el || count === 0) return

    const oneSetWidth = () => {
      const a = el.children[0] as HTMLElement | undefined
      const b = el.children[count] as HTMLElement | undefined
      return a && b ? b.offsetLeft - a.offsetLeft : 0
    }

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

    if (ensureCopies()) return
    window.addEventListener("resize", ensureCopies)

    const setW = oneSetWidth()
    if (setW <= 0) {
      return () => window.removeEventListener("resize", ensureCopies)
    }

    const SPEED = 0.02 // px per ms (~20px/s) — calm, minimal pace
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
      {/* Wider edge fades so logos slide in/out softly for a minimal look. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-background to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-background to-transparent sm:w-32" />

      <div
        ref={scrollerRef}
        className="flex gap-8 overflow-x-auto px-4 pb-1 sm:gap-12 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {repeated.map((item, i) => (
          <PartnerCard key={`${item.id}-${i}`} item={item} ariaHidden={i >= count} />
        ))}
      </div>
    </div>
  )
}

function PartnerCard({ item, ariaHidden }: { item: PartnerItem; ariaHidden: boolean }) {
  const card = (
    <div
      className="group/card relative flex h-16 w-32 shrink-0 items-center justify-center sm:h-20 sm:w-40"
      title={item.name || undefined}
    >
      {/* Logo only — no card, no shadow, no border. The .partner-logo
          class hooks the mix-blend-mode rule in PartnersMarquee which
          drops out the flat PNG background (multiply on light pages,
          lighten on dark pages) so logos sit cleanly on the canvas. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image_url}
        alt={item.name || "Partner"}
        loading="lazy"
        draggable={false}
        className="partner-logo max-h-full max-w-full object-contain"
        onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
      />
    </div>
  )

  const wrapperProps = ariaHidden ? { "aria-hidden": true, tabIndex: -1 } : {}

  if (!item.website_url) {
    return <div {...wrapperProps}>{card}</div>
  }

  if (item.website_url.startsWith("/")) {
    return (
      <Link href={item.website_url} {...wrapperProps}>
        {card}
      </Link>
    )
  }
  return (
    <a href={item.website_url} target="_blank" rel="noopener noreferrer" {...wrapperProps}>
      {card}
    </a>
  )
}
