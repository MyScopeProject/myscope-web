"use client"

import * as React from "react"
import Link from "next/link"

export interface PartnerItem {
  id: string
  image_url: string
  name: string | null
  website_url: string | null
}

// Two parallel strips of partner logos, both scrolling leftward (same
// direction) for a calm, continuous flow. Each row uses the same
// time-based scroll engine as PastEventsMarquee (integer steps +
// auto-duplication for seamless wrap).
//
// Item split: alternate by index so both rows get a varied mix rather
// than "first half" vs "second half". With a single partner, both rows
// show that one logo.
export function PartnersMarquee({ items }: { items: PartnerItem[] }) {
  if (!items?.length) return null

  const rowA = items.filter((_, i) => i % 2 === 0)
  const rowB = items.filter((_, i) => i % 2 === 1)
  const top = rowA.length ? rowA : items
  const bottom = rowB.length ? rowB : items

  return (
    <div className="partners-strip relative space-y-2">
      <MarqueeRow items={top} />
      <MarqueeRow items={bottom} />

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
      {/* Edge fades so logos slide in/out softly instead of clipping hard. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-background to-transparent" />

      <div
        ref={scrollerRef}
        className="flex gap-0 overflow-x-auto px-4 pb-1 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
      className="group/card relative flex h-24 w-40 shrink-0 items-center justify-center px-1 py-2 sm:h-28 sm:w-48"
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
