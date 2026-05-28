import type { MetadataRoute } from "next"

const SITE = "https://www.myscope.lk"
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Refresh the sitemap hourly so newly approved events get picked up.
export const revalidate = 3600

interface SitemapEvent {
  id: string
  updated_at?: string | null
  start_time?: string | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/events`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/become-organizer`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/help`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    // Policy pages required for PayHere live-merchant approval. Low priority
    // for SEO but still indexable so search engines see them as "real" pages
    // and the site reads as a complete, legitimate business.
    { url: `${SITE}/refund-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/cancellation-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]

  // Public, approved events — so each event detail page gets indexed (and can
  // surface as a sitelink). Soft-fails to just the static routes if the API is
  // unreachable at build/revalidate time.
  let eventRoutes: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(`${API}/api/events?limit=500`, { next: { revalidate: 3600 } })
    const data = await res.json()
    const events: SitemapEvent[] = data?.data?.events ?? []
    eventRoutes = events
      .filter((e) => e?.id)
      .map((e) => ({
        url: `${SITE}/events/${e.id}`,
        lastModified: e.updated_at ? new Date(e.updated_at) : e.start_time ? new Date(e.start_time) : now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      }))
  } catch {
    // events optional — keep the static sitemap valid
  }

  return [...staticRoutes, ...eventRoutes]
}
