"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"

// The carousel now consumes admin-managed slides instead of featured events.
// `link_url` is optional — when null the slide is a passive banner; when set
// (relative or absolute URL) the whole slide is clickable.
export interface HeroSlide {
  id: string
  image_url: string
  title?: string | null
  subtitle?: string | null
  link_url?: string | null
}

// Kept for back-compat with any existing imports / type unions during the
// transition. Maps to the new shape.
export interface HeroEvent {
  id: string
  title: string
  banner_url?: string | null
}

const AUTOPLAY_MS = 5000

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const router = useRouter()
  const [index, setIndex] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const count = slides.length

  // Resolve the destination for a slide click. External URLs open in a new
  // tab; relative paths stay in-app via the Next router. Slides with no
  // link_url at all are passive — clicking just advances the carousel.
  const openSlide = (slide: HeroSlide) => {
    const href = slide.link_url?.trim()
    if (!href) return
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer")
    } else {
      router.push(href.startsWith("/") ? href : `/${href}`)
    }
  }

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
          {slides.map((slide, i) => {
            const offset = offsetOf(i)
            return (
              <Slide
                key={slide.id}
                slide={slide}
                offset={offset}
                onClick={() => {
                  // Centre slide: follow the link if it has one (otherwise
                  // it's a passive banner — clicks do nothing). Off-centre
                  // slides advance the carousel toward them.
                  if (offset === 0) openSlide(slide)
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
          {slides.map((_, i) => (
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
  slide,
  offset,
  onClick,
}: {
  slide: HeroSlide
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

  const label = slide.title || "Hero slide"
  // Aria label communicates whether centred click follows a link or just
  // selects the slide; passive slides (no link_url) say "Show slide".
  const activeAria = slide.link_url ? `Open ${label}` : `Show ${label}`
  const peekAria = `Go to ${label}`

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isActive ? activeAria : peekAria}
      aria-hidden={!visible || undefined}
      tabIndex={isActive ? 0 : -1}
      className="absolute left-1/2 top-1/2 aspect-[4/5] h-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 transition-all duration-700 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        transform: `translate(-50%, -50%) translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
        transformStyle: "preserve-3d",
        opacity,
        zIndex,
        pointerEvents: visible ? "auto" : "none",
        // Passive (no-link) active slides still look fully active — only
        // off-centre peeks are dimmed.
        filter: isActive ? "none" : "brightness(0.5)",
        // Passive slides aren't clickable, but we still want to feel
        // interactive (e.g. on the peek they advance the carousel).
        cursor: isActive && !slide.link_url ? "default" : "pointer",
        willChange: "transform, opacity, filter",
      }}
    >
      <PosterImage slide={slide} />
      {/* Title / subtitle overlay, shown only when copy is present. */}
      {(slide.title || slide.subtitle) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-12 text-left sm:p-6 sm:pt-16">
          {slide.title && (
            <div className="line-clamp-2 text-base font-bold leading-tight text-white sm:text-2xl">
              {slide.title}
            </div>
          )}
          {slide.subtitle && (
            <div className="mt-1 line-clamp-2 text-xs text-white/80 sm:text-sm">
              {slide.subtitle}
            </div>
          )}
        </div>
      )}
    </button>
  )
}

function PosterImage({ slide }: { slide: HeroSlide }) {
  if (!slide.image_url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
        <ImageIcon className="h-12 w-12" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.image_url}
      alt={slide.title || "Hero slide"}
      className="h-full w-full object-cover"
      draggable={false}
    />
  )
}
