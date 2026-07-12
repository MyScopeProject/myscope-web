import { cn } from "@/lib/utils"

/**
 * Loading-state companion to <EventCard>. Mirrors its outer shape, poster
 * aspect, and content rhythm so the grid doesn't reflow when real data
 * arrives — only the inner bars fade out as cards swap in.
 *
 * Kept structural (no real text, no icons) — purely a layout placeholder.
 */
export function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      aria-hidden
      className={cn(
        "relative flex flex-col overflow-hidden bg-card dark:bg-card/60 dark:backdrop-blur-sm shadow-sm ring-1 ring-border/60",
        className,
      )}
    >
      {/* Poster — same 3:4 portrait aspect as the real card across every
          breakpoint. Keeps the loading footprint identical so nothing jumps
          when real cards swap in. */}
      <div className="relative aspect-3/4 overflow-hidden bg-muted">
        <div className="absolute inset-0 animate-pulse bg-muted" />
        {/* Date stub silhouette — matches the real white tile so the eye
            doesn't see anything jump when the real card arrives. */}
        <div className="absolute left-2 top-2 h-11 w-11 overflow-hidden rounded-lg bg-background/80 shadow-xl ring-1 ring-black/5 sm:left-3 sm:top-3 sm:h-16 sm:w-14 sm:rounded-xl">
          <div className="h-3 w-full bg-primary/40 sm:h-4" />
          <div className="flex h-[calc(100%-0.75rem)] items-center justify-center sm:h-[calc(100%-1rem)]">
            <div className="h-4 w-5 animate-pulse rounded bg-muted-foreground/20 sm:h-6 sm:w-7" />
          </div>
        </div>
      </div>

      {/* Info block — same paddings + rhythm as the real card */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-3">
        {/* Category chip placeholder */}
        <div className="h-3.5 w-16 animate-pulse rounded-full bg-muted sm:h-4 sm:w-20" />

        {/* Title — two lines */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-full animate-pulse rounded bg-muted sm:h-4" />
          <div className="h-3.5 w-3/5 animate-pulse rounded bg-muted sm:h-4" />
        </div>

        {/* Venue — time row was dropped from the real card, so the
            skeleton tracks it for an identical loading footprint. */}
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />

        {/* Price + CTA tail (mirrors the bordered footer block) */}
        <div className="mt-auto space-y-1.5 border-t border-border pt-2 sm:space-y-2 sm:pt-2.5">
          <div className="space-y-1">
            <div className="h-2.5 w-8 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted sm:h-7 sm:w-24" />
          </div>
          <div className="h-8 w-full animate-pulse bg-muted sm:h-9" />
        </div>
      </div>
    </article>
  )
}
