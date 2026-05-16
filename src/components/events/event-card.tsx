import Link from "next/link"
import { ImageIcon, MapPin } from "lucide-react"
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

function formatDateTime(when: string) {
  const d = new Date(when)
  const date = d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const raw = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  const time = raw.replace(":", ".")
  return `${date} · ${time}`
}

export function EventCard({ event, className }: EventCardProps) {
  const when = event.start_time || event.date
  const venue = event.venue_name || event.location
  const available = event.tickets_available ?? 0
  const sold = event.tickets_sold ?? 0
  const isSoldOut = available > 0 && available - sold <= 0
  const hasPrice = typeof event.price === "number"

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        className,
      )}
    >
      {/* Banner */}
      <Link
        href={`/events/${event.id}`}
        className="relative block aspect-16/10 overflow-hidden bg-muted"
        aria-label={event.title}
      >
        {event.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.banner_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/15 via-primary/5 to-secondary text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}

        {(event.featured || isSoldOut) && (
          <div className="absolute right-3 top-3 flex gap-1.5">
            {event.featured && <Badge variant="warning">Featured</Badge>}
            {isSoldOut && <Badge variant="destructive">Sold out</Badge>}
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-2">
          <Link href={`/events/${event.id}`}>
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {event.title}
            </h3>
          </Link>

          {event.category && (
            <Badge variant="secondary" className="rounded-full text-[11px] font-medium capitalize">
              {event.category}
            </Badge>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {when && <p className="font-medium text-foreground/80">{formatDateTime(when)}</p>}
          {venue && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{venue}</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            {hasPrice && event.price! > 0 ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    LKR
                  </span>
                  <span className="text-xl font-bold leading-none text-foreground">
                    {event.price!.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {event.has_multiple_tiers && (
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">Upwards</span>
                )}
              </>
            ) : hasPrice && event.price === 0 ? (
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">Free</span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>

          <Button asChild size="sm" className="shrink-0 rounded-full" disabled={isSoldOut}>
            <Link href={`/events/${event.id}`}>{isSoldOut ? "Sold out" : "Buy Now"}</Link>
          </Button>
        </div>
      </div>
    </article>
  )
}
