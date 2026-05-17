"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"

export interface HeroEvent {
  id: string
  title: string
  banner_url?: string | null
}

const AUTOPLAY_MS = 5000

export function HeroCarousel({ events }: { events: HeroEvent[] }) {
  const router = useRouter()
  const [index, setIndex] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const count = events.length

  const go = React.useCallback(
    (next: number) => {
      if (count === 0) return
      setIndex(((next % count) + count) % count)
    },
    [count],
  )

  // Autoplay
  React.useEffect(() => {
    if (paused || count <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [paused, count])

  React.useEffect(() => {
    const onVis = () => setPaused(document.hidden)
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  // Shortest-path offset on a circular list — keeps the rotation direction
  // intuitive when wrapping (e.g. 4 -> 0 should slide forward, not spin back).
  const offsetOf = React.useCallback(
    (i: number) => {
      const raw = i - index
      const half = count / 2
      if (raw > half) return raw - count
      if (raw < -half) return raw + count
      return raw
    },
    [index, count],
  )

  if (count === 0) return null

  return (
    <section
      className="relative overflow-hidden bg-background py-6 sm:py-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured events"
    >
      {/* 3D stage — perspective + preserve-3d so child rotateY actually renders in depth.
          Heights step up from phone → tablet → desktop so the stage doesn't dominate
          a phone viewport (was 460px which ate ~half the screen on common 800px phones). */}
      <div
        className="relative mx-auto h-[340px] w-full max-w-7xl px-3 sm:h-[520px] sm:px-6 lg:h-[600px]"
        style={{ perspective: "1600px" }}
      >
        <div
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {events.map((event, i) => {
            const offset = offsetOf(i)
            return (
              <Slide
                key={event.id}
                event={event}
                offset={offset}
                onClick={() => {
                  if (offset === 0) router.push(`/events/${event.id}`)
                  else go(i)
                }}
              />
            )
          })}
        </div>

        {/* Side arrows — slightly smaller on mobile so they don't crowd the poster */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="absolute left-1 top-1/2 z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-muted sm:left-6 sm:h-11 sm:w-11"
            >
              <ChevronLeft className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="absolute right-1 top-1/2 z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-muted sm:right-6 sm:h-11 sm:w-11"
            >
              <ChevronRight className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {events.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={`h-1 rounded-full transition-all ${
                i === index
                  ? "w-8 bg-primary"
                  : "w-5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function Slide({
  event,
  offset,
  onClick,
}: {
  event: HeroEvent
  offset: number
  onClick: () => void
}) {
  // Depth math — only the immediate neighbours are visible; further slides
  // are pushed off-screen so the stage stays clean.
  const abs = Math.abs(offset)
  const isActive = offset === 0
  const isAdjacent = abs === 1
  const visible = abs <= 1

  // Horizontal travel grows past the center so peek cards sit at the edges.
  const translateX = offset === 0 ? 0 : offset * 58 // %
  // Active sits forward; peeks recede into the scene.
  const translateZ = isActive ? 0 : -220
  // Coverflow tilt — angle the side cards toward the viewer.
  const rotateY = offset === 0 ? 0 : offset > 0 ? -32 : 32
  const scale = isActive ? 1 : 0.85
  const opacity = isActive ? 1 : isAdjacent ? 0.55 : 0
  const zIndex = isActive ? 30 : isAdjacent ? 20 : 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isActive ? `View ${event.title}` : `Go to ${event.title}`}
      aria-hidden={!visible || undefined}
      tabIndex={isActive ? 0 : -1}
      className="absolute left-1/2 top-1/2 aspect-[4/5] h-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 transition-all duration-700 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        transform: `translate(-50%, -50%) translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
        transformStyle: "preserve-3d",
        opacity,
        zIndex,
        pointerEvents: visible ? "auto" : "none",
        filter: isActive ? "none" : "brightness(0.5)",
        willChange: "transform, opacity, filter",
      }}
    >
      <PosterImage event={event} />
    </button>
  )
}

function PosterImage({ event }: { event: HeroEvent }) {
  if (!event.banner_url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
        <ImageIcon className="h-12 w-12" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={event.banner_url}
      alt={event.title}
      className="h-full w-full object-cover"
      draggable={false}
    />
  )
}
