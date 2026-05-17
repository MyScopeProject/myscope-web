import Link from "next/link"
import { Clock, ImageIcon, MapPin, Ticket } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EventCardData {
  id: string
  title: string
  category?: string | null
  date?: string | null
  start_time?: string | null
  location?: string | null
  venue_name?: string | null
  banner_url?: string | null
  price?: number | null
  tickets_available?: number | null
  tickets_sold?: number | null
  featured?: boolean
  has_multiple_tiers?: boolean
}

interface EventCardProps {
  event: EventCardData
  className?: string
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function formatTime(when: string) {
  const d = new Date(when)
  return d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function EventCard({ event, className }: EventCardProps) {
  const when = event.start_time || event.date
  const venue = event.venue_name || event.location
  const available = Number(event.tickets_available ?? 0)
  const sold = Number(event.tickets_sold ?? 0)
  const remaining = Math.max(0, available - sold)
  const isSoldOut = available > 0 && remaining <= 0
  // Low-stock cue: ≤10% remaining or ≤25 tickets left.
  const lowStock =
    !isSoldOut && available > 0 && (remaining / available <= 0.1 || remaining <= 25)
  const priceNum = event.price != null ? Number(event.price) : null
  const hasPrice = priceNum !== null && Number.isFinite(priceNum)
  const dateObj = when ? new Date(when) : null

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-sm ring-1 ring-border/60 transition-all duration-200",
        "hover:shadow-md hover:ring-primary/25",
        className,
      )}
    >
      {/* Poster image — portrait orientation, the visual hero of the card */}
      <Link
        href={`/events/${event.id}`}
        className="relative block aspect-3/4 overflow-hidden bg-muted"
        aria-label={event.title}
      >
        {event.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.banner_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}

        {/* Date stub — clean white tile, instant calendar recognition.
            Slightly smaller on phones since the whole card is now half-width. */}
        {dateObj && (
          <div className="absolute left-2 top-2 flex w-11 flex-col items-center overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 sm:left-3 sm:top-3 sm:w-14 sm:rounded-xl">
            <span className="w-full bg-primary py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-primary-foreground sm:py-1 sm:text-[10px]">
              {MONTHS[dateObj.getMonth()]}
            </span>
            <span className="py-1 text-lg font-bold leading-none text-gray-900 sm:py-1.5 sm:text-2xl">
              {dateObj.getDate()}
            </span>
          </div>
        )}

        {/* Top-right floating badges */}
        {(event.featured || isSoldOut) && (
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            {event.featured && <Badge variant="warning">Featured</Badge>}
            {isSoldOut && <Badge variant="destructive">Sold out</Badge>}
          </div>
        )}

        {/* Soft bottom shading — lifts banner against any background */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
      </Link>

      {/* Info block — tighter on phones since the card is now half-width */}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        {/* Meta row: category + low-stock cue */}
        <div className="flex flex-wrap items-center gap-1.5">
          {event.category && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary sm:px-2.5 sm:text-[10px]">
              {event.category}
            </span>
          )}
          {lowStock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400 sm:px-2.5 sm:text-[10px]">
              <Ticket className="h-2.5 w-2.5" />
              {remaining} left
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/events/${event.id}`} className="-mt-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base">
            {event.title}
          </h3>
        </Link>

        {/* Compact meta — hide time on phones (date is on the poster stub anyway) */}
        <div className="space-y-1 text-[11px] text-muted-foreground sm:text-xs">
          {when && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatTime(when)}</span>
            </div>
          )}
          {venue && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{venue}</span>
            </div>
          )}
        </div>

        {/* Price + CTA row */}
        <div className="mt-auto space-y-2 border-t border-border pt-2 sm:space-y-3 sm:pt-3">
          <div>
            {hasPrice && priceNum! > 0 ? (
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">LKR</div>
                <div className="truncate text-base font-bold leading-tight tracking-tight text-foreground sm:text-xl">
                  {formatPrice(priceNum!)}
                </div>
                {event.has_multiple_tiers && (
                  <div className="text-[10px] font-medium text-muted-foreground sm:text-xs">Upwards</div>
                )}
              </div>
            ) : hasPrice && priceNum === 0 ? (
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Entry</div>
                <div className="text-base font-bold leading-tight text-emerald-600 dark:text-emerald-400 sm:text-xl">Free</div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>

          <Button
            asChild
            size="sm"
            variant={isSoldOut ? "outline" : "default"}
            className="w-full rounded-lg text-xs sm:text-sm"
            disabled={isSoldOut}
          >
            <Link href={`/events/${event.id}`}>
              {isSoldOut ? "Sold out" : "Get tickets"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}
