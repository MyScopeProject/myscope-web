import type { Metadata } from "next"
import Script from "next/script"

const SITE = "https://www.myscope.lk"
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface EventForSchema {
  id: string
  title: string
  description?: string | null
  banner_url?: string | null
  start_time?: string | null
  end_time?: string | null
  date?: string | null
  venue_name?: string | null
  location?: string | null
  category?: string | null
  postponed?: boolean
  sales_paused?: boolean
  price?: number | string | null
  organizer?: { business_name?: string | null } | null
}

// Per-event metadata so each event page is indexed with its own title,
// description and share image (the detail page itself is a client component, so
// metadata lives here in the server layout that wraps it).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetch(`${API}/api/events/${id}`, { next: { revalidate: 600 } })
    const data = await res.json()
    const e = data?.data?.event
    if (!e?.title) return {}

    const title = e.title as string
    const description = ((e.description as string) || `Book tickets for ${title} on MyScope.`)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160)
    const images = e.banner_url ? [e.banner_url as string] : undefined
    const url = `${SITE}/events/${id}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: "website", images },
      twitter: { card: "summary_large_image", title, description, images },
    }
  } catch {
    return {}
  }
}

/**
 * Build a Google-friendly schema.org Event JSON-LD blob for the event.
 *
 * Why this matters: with this in place, Google can show the event in its rich
 * "Events near you" UI (carousel + knowledge panel), surface a direct "Get
 * tickets" button in search results, and add the event to a user's Calendar
 * from the SERP. Massive CTR boost for "concerts in Colombo" type queries.
 *
 * Test with https://search.google.com/test/rich-results — paste the live URL
 * and confirm the parser sees an "Event" object with no errors.
 *
 * We return null when required fields are missing (no title, no start time),
 * so the script tag is omitted rather than emitting an invalid LD blob.
 */
function buildEventJsonLd(e: EventForSchema): Record<string, unknown> | null {
  if (!e.title) return null

  const startDate = e.start_time || e.date
  if (!startDate) return null // Required by schema.org/Event

  const url = `${SITE}/events/${e.id}`
  const description = ((e.description as string) || `Book tickets for ${e.title} on MyScope.`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000) // Google docs cap at ~5kB; we stay well under

  // eventStatus: schema.org has specific URIs for each. Postponed and paused
  // both map to neutral "EventScheduled" since "Postponed" is reserved for
  // events with a new known date and "Cancelled" is too strong. The site UI
  // shows the actual status separately.
  const eventStatus = e.postponed
    ? "https://schema.org/EventPostponed"
    : "https://schema.org/EventScheduled"

  // Offer: tells Google what tickets cost. `price` is the cheapest currently
  // available tier (the public event API returns it already-min'd across
  // active tiers). availability flips to SoldOut/Withdrawn for paused or
  // postponed-without-buying.
  const priceNum = e.price != null ? Number(e.price) : null
  const availability = e.sales_paused
    ? "https://schema.org/SoldOut"
    : "https://schema.org/InStock"

  const offers: Record<string, unknown> = {
    "@type": "Offer",
    url,
    availability,
    priceCurrency: "LKR",
    // Schema.org expects a string. Even free events get "0".
    price: priceNum != null && Number.isFinite(priceNum) ? priceNum.toFixed(2) : "0.00",
    validFrom: new Date().toISOString(),
  }

  const location: Record<string, unknown> = {
    "@type": "Place",
    name: e.venue_name || e.location || "Venue TBA",
    // Google strongly prefers a postal address; we only have free-form
    // location text. Better than nothing.
    address: {
      "@type": "PostalAddress",
      addressLocality: e.location || e.venue_name || "Sri Lanka",
      addressCountry: "LK",
    },
  }

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description,
    url,
    startDate,
    ...(e.end_time ? { endDate: e.end_time } : {}),
    eventStatus,
    // Most MyScope events are in-person; we don't currently surface a
    // "virtual event" flag from the API. Hardcoded for now — flip per-event
    // once the schema supports it.
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location,
    ...(e.banner_url ? { image: [e.banner_url] } : {}),
    offers,
  }

  if (e.organizer?.business_name) {
    ld.organizer = {
      "@type": "Organization",
      name: e.organizer.business_name,
    }
  }

  return ld
}

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch event data again here so we can render JSON-LD. Next.js dedupes
  // identical fetches with `next.revalidate` in the same request, so this
  // doesn't actually round-trip twice — the generateMetadata fetch above
  // and this one share the cached response.
  let ld: Record<string, unknown> | null = null
  try {
    const res = await fetch(`${API}/api/events/${id}`, { next: { revalidate: 600 } })
    const data = await res.json()
    const e = data?.data?.event
    if (e) ld = buildEventJsonLd(e)
  } catch {
    // structured data is optional — drop silently
  }

  return (
    <>
      {ld && (
        <Script
          id="jsonld-event"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      )}
      {children}
    </>
  )
}
