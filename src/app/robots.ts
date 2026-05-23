import type { MetadataRoute } from "next"

const SITE = "https://www.myscope.lk"

// Tells crawlers what to index and where the sitemap is. Private/transactional
// areas are disallowed so only public marketing + event pages get indexed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/organizer",
          "/scanner",
          "/bookings",
          "/auth",
          "/admin",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
