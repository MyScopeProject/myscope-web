"use client"

import Link from "next/link"

export interface PastEventItem {
  id: string
  image_url: string
  title: string | null
  link_url: string | null
}

// Auto-scrolling, infinite strip of past-event photos. The track renders the
// items twice and translates -50% (see --animate-marquee in globals.css), so it
// loops seamlessly. Pauses on hover; honours prefers-reduced-motion.
export function PastEventsMarquee({ items }: { items: PastEventItem[] }) {
  if (!items || items.length === 0) return null

  // Duplicate the list so the -50% translate lands exactly one full set over.
  const doubled = [...items, ...items]

  return (
    <div className="group relative overflow-hidden">
      {/* Edge fades so cards slide in/out softly instead of clipping hard. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />

      <div className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {doubled.map((item, i) => (
          <PastEventCard key={`${item.id}-${i}`} item={item} ariaHidden={i >= items.length} />
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
        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
      />
      {item.title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
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
